import React, { useState, useMemo } from "react";
import { Tooltip } from "@mui/material";
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
  Paper,
  Divider,
  Chip,
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
  EventAvailable,
  Clear,
  Info,
} from "@mui/icons-material";

// Styled components
const GlassPaper = styled(Paper)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.98)',
  backdropFilter: 'blur(20px)',
  borderRadius: 24,
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  overflow: 'hidden',
}));

const DayButton = styled(Box)(({ theme, selected, disabled, isToday, accentColor }) => ({
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  borderRadius: selected ? 14 : '50%',
  fontWeight: 600,
  fontSize: '0.9rem',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  color: disabled ? '#ccc' : selected ? '#fff' : '#333',
  backgroundColor: selected ? accentColor : 'transparent',
  border: isToday && !selected ? `2px solid ${accentColor}` : 'none',
  opacity: disabled ? 0.4 : 1,
  transform: selected ? 'scale(1.05)' : 'scale(1)',
  boxShadow: selected ? `0 4px 12px ${alpha(accentColor, 0.4)}` : 'none',
  '&:hover': disabled ? {} : {
    transform: selected ? 'scale(1.08)' : 'scale(1.1)',
    backgroundColor: selected ? accentColor : alpha(accentColor, 0.1),
    boxShadow: selected ? `0 6px 16px ${alpha(accentColor, 0.5)}` : 'none',
  },
}));

const NavigationButton = styled(IconButton)(({ theme, accentColor }) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  backgroundColor: alpha(accentColor, 0.08),
  color: accentColor,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(accentColor, 0.15),
    transform: 'scale(1.05)',
  },
}));

// --- ADDED: Accept leaveRequests and maxSelectableDates as props ---
const LeaveDatePicker = ({ 
  open, 
  onClose, 
  selectedDates, 
  setSelectedDates,
  accentColor = '#6d2323',
  accentDark = '#8B3333',
  primaryColor = '#FEF9E1',
  secondaryColor = '#FFF8E7',
  allowPastDates = false, // NEW: Set to true for sick leave
  leaveType = '', // NEW: Pass leave type to show info
  leaveRequests = [], // NEW: pass leaveRequests for HR-approved logic
  maxSelectableDates = null, // NEW: pass max days allowed
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [overBalanceWarning, setOverBalanceWarning] = useState('');

  // --- Find HR-approved dates ---
  const hrApprovedDates = useMemo(() => {
    const dates = new Set();
    leaveRequests.forEach(req => {
      if (String(req.status) === '2') {
        (req.leave_date || '').split(',').forEach(d => {
          if (d.trim()) dates.add(d.trim());
        });
      }
    });
    return dates;
  }, [leaveRequests]);

  // --- Over-balance warning ---
  React.useEffect(() => {
    if (maxSelectableDates !== null && selectedDates.length > maxSelectableDates) {
      setOverBalanceWarning(`Insufficient balance — you have ${maxSelectableDates.toFixed(1)} day(s) but selected ${selectedDates.length}.`);
    } else {
      setOverBalanceWarning('');
    }
  }, [selectedDates, maxSelectableDates]);

  const formatDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toggleDate = (dateStr) => {
    // Prevent selecting HR-approved
    if (hrApprovedDates.has(dateStr)) return;
    // Allow deselecting always, but only allow selecting if not over max
    setSelectedDates((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr);
      } else {
        if (maxSelectableDates !== null && prev.length >= maxSelectableDates) {
          // Allow over-select for warning, but don't block selection
          return [...prev, dateStr];
        }
        return [...prev, dateStr];
      }
    });
  };

  const clearAllDates = () => {
    setSelectedDates([]);
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const blanks = Array.from({ length: firstDay }, (_, i) => ({
      type: 'blank',
      key: `blank-${i}`,
    }));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateObj = new Date(year, month, dayNum);
      const dateStr = formatDate(dateObj);
      const isSelected = selectedDates.includes(dateStr);
      const isToday = dateObj.getTime() === today.getTime();
      // Only disable past dates if allowPastDates is false
      const isPast = !allowPastDates && dateObj < today;
      // --- Disable if HR-approved ---
      const isHRApproved = hrApprovedDates.has(dateStr);
      // --- Disable if over balance ---
      // Only disable if HR-approved or past
      return {
        type: 'day',
        key: dateStr,
        dayNum,
        dateStr,
        isSelected,
        isToday,
        isPast,
        isHRApproved,
        // isOverBalance: false, // not used for disabling now
      };
    });

    return [...blanks, ...days];
  }, [currentMonth, selectedDates, allowPastDates, hrApprovedDates, maxSelectableDates]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const formatSelectedDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedSelectedDates = [...selectedDates].sort();

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Fade in={open}>
        <GlassPaper sx={{ width: '100%', maxWidth: 520, maxHeight: '90vh' }}>
          {/* Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
              p: 3,
              color: primaryColor,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: alpha(primaryColor, 0.1) }} />
            <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 60, height: 60, borderRadius: '50%', background: alpha(primaryColor, 0.08) }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 3, background: alpha(primaryColor, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarMonth sx={{ fontSize: 26, color: primaryColor }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Select Leave Dates
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Click dates to select or deselect
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={onClose} sx={{ color: primaryColor, backgroundColor: alpha(primaryColor, 0.15), '&:hover': { backgroundColor: alpha(primaryColor, 0.25) } }}>
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Info Banner for Sick Leave */}
          {allowPastDates && (
            <Box
              sx={{
                px: 3,
                py: 2,
                backgroundColor: alpha('#1565C0', 0.08),
                borderBottom: `1px solid ${alpha('#1565C0', 0.15)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Info sx={{ color: '#1565C0', fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: '#1565C0', fontWeight: 500 }}>
                Past dates are enabled for sick leave filing
              </Typography>
            </Box>
          )}

          {/* Month Navigation */}
          <Box
            sx={{
              px: 3,
              py: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${alpha(accentColor, 0.1)}`,
              backgroundColor: alpha(primaryColor, 0.3),
            }}
          >
            <NavigationButton onClick={goToPreviousMonth} accentColor={accentColor}>
              <ChevronLeft />
            </NavigationButton>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor, textTransform: 'capitalize' }}>
                {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
              </Typography>
              <Button size="small" onClick={goToToday} startIcon={<Today sx={{ fontSize: 16 }} />} sx={{ mt: 0.5, color: accentColor, fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>
                Today
              </Button>
            </Box>

            <NavigationButton onClick={goToNextMonth} accentColor={accentColor}>
              <ChevronRight />
            </NavigationButton>
          </Box>

          {/* Calendar Grid */}
          <Box sx={{ p: 3 }}>
            {/* Day headers */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1.5 }}>
              {daysOfWeek.map((day, index) => (
                <Box
                  key={day}
                  sx={{
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: index === 0 || index === 6 ? alpha(accentColor, 0.5) : accentColor,
                    textTransform: 'uppercase',
                  }}
                >
                  {day}
                </Box>
              ))}
            </Box>

            {/* Days grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
              {calendarData.map((item) => {
                if (item.type === 'blank') {
                  return <Box key={item.key} sx={{ width: 44, height: 44 }} />;
                }
                // Tooltip for HR-approved
                const dayButton = (
                  <DayButton
                    key={item.key}
                    selected={item.isSelected}
                    disabled={item.isPast || item.isHRApproved}
                    isToday={item.isToday}
                    accentColor={accentColor}
                    onClick={() => !(item.isPast || item.isHRApproved) && toggleDate(item.dateStr)}
                    sx={item.isHRApproved ? { border: `2px solid #C62828`, background: 'rgba(198,40,40,0.08)' } : {}}
                  >
                    {item.dayNum}
                    {item.isSelected && (
                      <Box sx={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', backgroundColor: primaryColor }} />
                    )}
                  </DayButton>
                );
                if (item.isHRApproved) {
                  return (
                    <Tooltip key={item.key} title={"This date is unavailable. An HR-approved leave has already been scheduled."} arrow>
                      <span>{dayButton}</span>
                    </Tooltip>
                  );
                }
                return dayButton;
              })}
            </Box>
          </Box>

          {/* Over-balance warning */}
          {overBalanceWarning && (
            <Box sx={{ px: 3, pb: 1 }}>
              <Typography variant="body2" sx={{ color: '#C62828', fontWeight: 600, mb: 1 }}>
                {overBalanceWarning}
              </Typography>
            </Box>
          )}
          {/* Footer Actions */}
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderTop: `1px solid ${alpha(accentColor, 0.1)}`,
              backgroundColor: alpha(primaryColor, 0.3),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Button
              onClick={clearAllDates}
              disabled={selectedDates.length === 0}
              startIcon={<Clear />}
              sx={{
                color: accentColor,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { backgroundColor: alpha(accentColor, 0.08) },
// (Removed duplicate, invalid Button code block that caused syntax error)
                '&:disabled': { color: '#ccc' },
              }}
            >
              Clear All
            </Button>

            <Button
              onClick={onClose}
              variant="contained"
              startIcon={<Check />}
              sx={{
                backgroundColor: accentColor,
                color: primaryColor,
                fontWeight: 700,
                textTransform: 'none',
                px: 4,
                py: 1.2,
                borderRadius: 3,
                boxShadow: `0 4px 14px ${alpha(accentColor, 0.4)}`,
                '&:hover': {
                  backgroundColor: accentDark,
                  boxShadow: `0 6px 20px ${alpha(accentColor, 0.5)}`,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Confirm ({selectedDates.length} selected)
            </Button>
          </Box>
        </GlassPaper>
      </Fade>
    </Modal>
  );
};

export default LeaveDatePicker;