import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Chip,
  CircularProgress,
  LinearProgress,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  alpha,
  styled,
  Card,
  Fab,
  Zoom,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Paper,
  List,
  ListItem,
  Avatar,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  CalendarToday,
  Today,
  ArrowBackIos,
  Clear,
  SaveAs,
  Refresh,
  Edit,
  FilterList,
  CheckCircle,
  CompareArrows,
  AdminPanelSettings,
  Cancel,
  VerifiedUser,
  Person,
  KeyboardArrowUp,
  EventNote,
  TableRows,
  AddCircleOutline,
  Close,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Poppins font import ───────────────────────────────────────────────────
const poppinsImport = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`;

// ─── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.055)",
  rowOdd:       "rgba(109,35,35,0.025)",
  rowHover:     "rgba(109,35,35,0.055)",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  surface:      "#ffffff",
  divider:      "rgba(0,0,0,0.08)",
  weekend:      "rgba(109,35,35,0.045)",
  noRecord:     "rgba(245,158,11,0.06)",
  noRecordBorder:"rgba(245,158,11,0.25)",
  font:         "'Poppins', sans-serif",
};

// ─── Shimmer keyframes ─────────────────────────────────────────────────────
const shimmerKf = `
${poppinsImport}
* { font-family: 'Poppins', sans-serif !important; }
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: "linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)",
    backgroundSize: "800px 100%",
    animation: "shimmer 1.6s infinite linear",
    flexShrink: 0, ...sx,
  }} />
);

const AttendanceSearchWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
      width: "100vw", maxWidth: "100%",
      position: "relative", left: "63%", transform: "translateX(-61%)",
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{ mb: 2, borderRadius: "12px", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)", animation: "blink 2s ease-in-out infinite" }}>
        <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", gap: 2.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
          <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={380} h={11} /></Box>
        </Box>
      </Box>
      <Box sx={{ mb: 2, borderRadius: "12px", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)", bgcolor: "#fff", animation: "blink 2s ease-in-out 0.1s infinite" }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.25, minHeight: 42 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} />
          <Bone w={180} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ flex: 1, height: 40, borderRadius: "8px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
            ))}
          </Box>
          <Box sx={{ border: `2px dashed ${T.accentBorder}`, borderRadius: "8px", p: 3 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Box key={i} sx={{ width: 64, height: 36, borderRadius: "6px", bgcolor: T.accentFaint }} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ borderRadius: "12px", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)", bgcolor: "#fff", animation: "blink 2s ease-in-out 0.2s infinite" }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent, display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 1.4fr 1.4fr 1.4fr 1.4fr", gap: 2 }}>
          {[100, 70, 55, 90, 115, 120, 88].map((w, i) => (
            <Box key={i} sx={{ height: 10, width: w, borderRadius: 3, bgcolor: "rgba(255,255,255,0.22)" }} />
          ))}
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ px: 2.5, py: 2, display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 1.4fr 1.4fr 1.4fr 1.4fr", gap: 2, alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.05)", bgcolor: i % 2 === 0 ? "#fff" : T.rowOdd }}>
            <Bone w={90} h={12} /><Bone w={70} h={12} /><Bone w={55} h={12} />
            {[0, 1, 2, 3].map((ci) => (
              <Box key={ci} sx={{ height: 36, borderRadius: "6px", border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Styled primitives ─────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
  fontFamily: "'Poppins', sans-serif",
});

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8, backgroundColor: '#fff', transition: 'border-color 0.18s',
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent },
  },
  '& label.Mui-focused': { color: T.accent },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box sx={{
    px: 2.5, py: 1.25,
    borderBottom: `1px solid ${T.divider}`,
    display: "flex", alignItems: "center", gap: 1.25,
    bgcolor: T.accentFaint, minHeight: 42,
  }}>
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent, fontFamily: T.font }}>{title}</Typography>
    {right && <><Box sx={{ flex: 1 }} />{right}</>}
  </Box>
);

const NativeInput = ({ value, onChange, type = "text", placeholder, disabled, icon }) => (
  <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
    {icon && (
      <Box sx={{ position: "absolute", left: 10, color: T.accentMid, display: "flex", alignItems: "center", zIndex: 1, pointerEvents: "none" }}>
        {icon}
      </Box>
    )}
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: "100%",
        padding: icon ? "9px 13px 9px 34px" : "9px 13px",
        borderRadius: "8px",
        border: `1px solid ${T.accentBorder}`,
        fontSize: "0.875rem", outline: "none",
        fontFamily: T.font, boxSizing: "border-box",
        transition: "border-color 0.18s",
        background: disabled ? "#f5f5f5" : "#fff",
        color: T.text,
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={(e) => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={(e) => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = "none"; }}
    />
  </Box>
);

// ─── Auto-colon Time Input ─────────────────────────────────────────────────
const digitsOnly = (str) => (str || "").replace(/\D/g, "");

const formatTimeDigits = (digits) => {
  const d = digits.slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4)}`;
};

const parseStoredTime = (val) => {
  if (!val || String(val).trim() === "") return { digits: "", ampm: "AM" };
  const str = String(val).trim().toUpperCase();
  let ampm = "AM";
  let timePart = str;
  if (str.endsWith(" PM")) { ampm = "PM"; timePart = str.slice(0, -3).trim(); }
  else if (str.endsWith(" AM")) { ampm = "AM"; timePart = str.slice(0, -3).trim(); }
  else if (str.endsWith("PM")) { ampm = "PM"; timePart = str.slice(0, -2).trim(); }
  else if (str.endsWith("AM")) { ampm = "AM"; timePart = str.slice(0, -2).trim(); }
  else {
    const hm = str.match(/^(\d{1,2}):/);
    if (hm) ampm = parseInt(hm[1], 10) >= 12 ? "PM" : "AM";
  }
  return { digits: digitsOnly(timePart), ampm };
};

const buildStoredTime = (digits, ampm) => {
  if (!digits) return "";
  return `${formatTimeDigits(digits)} ${ampm}`;
};

const TimeInput = ({ value, onChange, unsaved, savedMod, isNewRow }) => {
  const { digits: initDigits, ampm: initAmPm } = parseStoredTime(value);
  const [localDigits, setLocalDigits] = useState(initDigits);
  const [ampm, setAmPm] = useState(initAmPm);

  useEffect(() => {
    const { digits, ampm: ap } = parseStoredTime(value);
    setLocalDigits(digits);
    setAmPm(ap);
  }, [value]);

  const borderColor = unsaved
    ? "#e65100"
    : savedMod
    ? "#2e7d32"
    : isNewRow
    ? "rgba(245,158,11,0.4)"
    : T.accentBorder;

  const bgColor = unsaved
    ? "rgba(230,81,0,0.04)"
    : savedMod
    ? "rgba(46,125,50,0.04)"
    : isNewRow
    ? "rgba(245,158,11,0.04)"
    : "#fff";

  const handleKeyDown = (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = localDigits.slice(0, -1);
      setLocalDigits(newDigits);
      onChange({ target: { value: buildStoredTime(newDigits, ampm) } });
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      setLocalDigits("");
      onChange({ target: { value: "" } });
      return;
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      if (localDigits.length >= 6) return;
      const newDigits = localDigits + e.key;
      setLocalDigits(newDigits);
      onChange({ target: { value: buildStoredTime(newDigits, ampm) } });
    }
  };

  const toggleAmPm = () => {
    const newAmPm = ampm === "AM" ? "PM" : "AM";
    setAmPm(newAmPm);
    onChange({ target: { value: buildStoredTime(localDigits, newAmPm) } });
  };

  const displayValue = formatTimeDigits(localDigits);

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <input
        type="text"
        value={displayValue}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        readOnly={false}
        placeholder="HH:MM:SS"
        style={{
          width: "90px",
          padding: "7px 8px",
          borderRadius: "6px 0 0 6px",
          border: `1.5px solid ${borderColor}`,
          borderRight: "none",
          fontSize: "0.78rem",
          outline: "none",
          fontFamily: "monospace",
          boxSizing: "border-box",
          background: bgColor,
          color: T.text,
          transition: "border-color 0.15s",
          letterSpacing: "0.04em",
          caretColor: T.accent,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = unsaved ? "#e65100" : T.accent;
          e.target.style.boxShadow = `0 0 0 1.5px ${unsaved ? "#e65100" : T.accent}22`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = borderColor;
          e.target.style.boxShadow = "none";
        }}
      />
      <button
        type="button"
        onClick={toggleAmPm}
        title={`Click to switch to ${ampm === "AM" ? "PM" : "AM"}`}
        style={{
          width: "38px",
          padding: "7px 4px",
          borderRadius: "0 6px 6px 0",
          border: `1.5px solid ${borderColor}`,
          fontSize: "0.68rem",
          fontWeight: 800,
          fontFamily: T.font,
          cursor: "pointer",
          background: ampm === "AM"
            ? "rgba(25,118,210,0.10)"
            : "rgba(198,40,40,0.10)",
          color: ampm === "AM" ? "#1565c0" : "#b71c1c",
          transition: "all 0.15s",
          letterSpacing: "0.03em",
          userSelect: "none",
          lineHeight: 1,
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = ampm === "AM"
            ? "rgba(25,118,210,0.18)"
            : "rgba(198,40,40,0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = ampm === "AM"
            ? "rgba(25,118,210,0.10)"
            : "rgba(198,40,40,0.10)";
        }}
      >
        {ampm}
      </button>
    </Box>
  );
};

const MemoTimeInput = memo(TimeInput);

const RecordsRow = memo(function RecordsRow({
  record,
  savedRecord,
  index,
  everModifiedFields,
  onFieldChange,
}) {
  const rowDirty = isDirty(record, savedRecord);
  const rowSavedMod =
    !rowDirty &&
    EDITABLE_FIELDS.some((f) =>
      everModifiedFields.has(`${record.personID}-${record.date}-${f}`)
    );
  const isManual = record.manualEntry === 1;
  const leftBorder = rowDirty
    ? "3px solid #e65100"
    : rowSavedMod
    ? "3px solid #2e7d32"
    : isManual
    ? "3px solid #7b1fa2"
    : "3px solid transparent";

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 0.8fr 1.6fr 1.6fr 1.6fr 1.6fr",
        px: 2.5,
        py: 1.5,
        gap: 2,
        alignItems: "center",
        bgcolor: rowDirty
          ? alpha("#e65100", 0.04)
          : rowSavedMod
          ? alpha("#2e7d32", 0.04)
          : isManual
          ? alpha("#7b1fa2", 0.04)
          : index % 2 === 0
          ? "#fff"
          : T.rowOdd,
        borderBottom: `1px solid ${T.divider}`,
        borderLeft: leftBorder,
        transition: "background 0.13s",
        "&:hover": { bgcolor: T.rowHover },
        minWidth: 960,
      }}
    >
      <Box>
        <Typography
          sx={{ fontWeight: 600, fontSize: "0.8rem", color: T.text, fontFamily: T.font }}
        >
          {record.personID}
        </Typography>
        {isManual && <ManualEntryBadge />}
      </Box>
      <Typography
        sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 500, fontFamily: T.font }}
      >
        {record.date}
      </Typography>
      <Typography
        sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 500, fontFamily: T.font }}
      >
        {record.Day}
      </Typography>
      {EDITABLE_FIELDS.map((field) => {
        const unsaved = savedRecord && (record[field] || "") !== (savedRecord[field] || "");
        const savedMod = !unsaved && everModifiedFields.has(`${record.personID}-${record.date}-${field}`);
        return (
          <Box key={field}>
            <MemoTimeInput
              value={record[field] || ""}
              onChange={(e) => onFieldChange(index, field, e.target.value)}
              unsaved={unsaved}
              savedMod={savedMod}
            />
            {unsaved && (
              <Typography sx={{ fontSize: "0.67rem", mt: 0.3, color: "#b71c1c", fontFamily: "monospace" }}>
                was: {savedRecord[field] || "—"}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
});

const FullMonthRow = memo(function FullMonthRow({
  record,
  savedRow,
  index,
  fullEverModified,
  onFieldChange,
}) {
  const weekend = isWeekend(record.Day);
  const rowDirty = !record.isNew && isDirty(record, savedRow);
  const rowSavedMod =
    !record.isNew &&
    !rowDirty &&
    EDITABLE_FIELDS.some((f) => fullEverModified.has(`${record.date}-${f}`));
  const hasTyped = record.isNew && hasAnyTime(record);

  const leftBorder = rowDirty
    ? "3px solid #e65100"
    : rowSavedMod
    ? "3px solid #2e7d32"
    : hasTyped
    ? "3px solid #f59e0b"
    : "3px solid transparent";

  const rowBg = rowDirty
    ? alpha("#e65100", 0.04)
    : rowSavedMod
    ? alpha("#2e7d32", 0.04)
    : record.isNew
    ? T.noRecord
    : weekend
    ? T.weekend
    : index % 2 === 0
    ? "#fff"
    : T.rowOdd;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "0.6fr 1fr 0.8fr 1.6fr 1.6fr 1.6fr 1.6fr",
        px: 2.5,
        py: 1.25,
        gap: 2,
        alignItems: "center",
        bgcolor: rowBg,
        borderBottom: `1px solid ${T.divider}`,
        borderLeft: leftBorder,
        transition: "background 0.13s",
        "&:hover": { bgcolor: T.rowHover },
        minWidth: 960,
      }}
    >
      <Box>
        {record.isNew ? (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: 0.9, py: 0.25, borderRadius: "4px", bgcolor: alpha("#f59e0b", 0.14), border: `1px solid ${alpha("#f59e0b", 0.35)}` }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#f59e0b" }} />
            <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: "#92400e", whiteSpace: "nowrap", fontFamily: T.font }}>
              NO RECORD
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: 0.9, py: 0.25, borderRadius: "4px", bgcolor: alpha("#2e7d32", 0.1), border: `1px solid ${alpha("#2e7d32", 0.25)}` }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#2e7d32" }} />
            <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: "#1b5e20", whiteSpace: "nowrap", fontFamily: T.font }}>
              HAS RECORD
            </Typography>
          </Box>
        )}
      </Box>

      <Typography sx={{ fontSize: "0.78rem", color: weekend ? T.accentMid : T.muted, fontWeight: weekend ? 700 : 500, fontFamily: T.font }}>
        {record.date}
      </Typography>
      <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 500, fontFamily: T.font }}>
        {record.Day}
      </Typography>

      {EDITABLE_FIELDS.map((field) => {
        const unsaved = !record.isNew && savedRow && (record[field] || "") !== (savedRow[field] || "");
        const savedMod = !record.isNew && !unsaved && fullEverModified.has(`${record.date}-${field}`);
        return (
          <Box key={field}>
            <MemoTimeInput
              value={record[field] || ""}
              onChange={(e) => onFieldChange(index, field, e.target.value)}
              unsaved={unsaved}
              savedMod={savedMod}
              isNewRow={record.isNew}
            />
            {unsaved && (
              <Typography sx={{ fontSize: "0.67rem", mt: 0.3, color: "#b71c1c", fontFamily: "monospace" }}>
                was: {savedRow[field] || "—"}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
});

const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick} disabled={disabled}
    style={{
      background: "transparent", border: `1px solid ${color}40`,
      borderRadius: "6px", padding: "4px 10px",
      cursor: disabled ? "default" : "pointer", color,
      display: "flex", alignItems: "center", gap: "4px",
      fontSize: "0.72rem", fontWeight: 700, fontFamily: T.font,
      transition: "background-color 0.15s, border-color 0.15s",
      whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

const QuickBtn = ({ label, icon, onClick, active }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? T.accent : "transparent",
      border: `1px solid ${active ? T.accent : T.accentBorder}`,
      borderRadius: "6px", padding: "6px 14px", cursor: "pointer",
      color: active ? "#fff" : T.accent,
      display: "flex", alignItems: "center", gap: "5px",
      fontSize: "0.78rem", fontWeight: 700, fontFamily: T.font,
      transition: "all 0.15s ease", whiteSpace: "nowrap",
    }}
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = T.accentBorder; } }}
  >
    {icon}{label}
  </button>
);

const TabBtn = ({ active, icon: Icon, label, badge, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "8px 18px",
      borderRadius: "8px 8px 0 0",
      border: `1px solid ${active ? T.accentBorder : "transparent"}`,
      borderBottom: active ? "1px solid #fff" : `1px solid ${T.divider}`,
      background: active ? "#fff" : "transparent",
      cursor: "pointer",
      color: active ? T.accent : T.muted,
      fontSize: "0.8rem", fontWeight: active ? 800 : 600,
      fontFamily: T.font,
      marginBottom: active ? "-1px" : "0",
      transition: "all 0.15s ease",
      position: "relative", zIndex: active ? 2 : 1,
    }}
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accentFaint; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = "transparent"; } }}
  >
    <Icon sx={{ fontSize: 14 }} />
    {label}
    {badge != null && (
      <Box sx={{
        px: 0.75, py: 0.1, borderRadius: "10px",
        bgcolor: active ? T.accent : "rgba(0,0,0,0.1)",
        color: active ? "#fff" : T.muted,
        fontSize: "0.65rem", fontWeight: 800, lineHeight: 1.6,
        minWidth: 18, textAlign: "center",
      }}>
        {badge}
      </Box>
    )}
  </button>
);

const ManualEntryBadge = () => (
  <Box sx={{
    display: "inline-flex", alignItems: "center", gap: 0.5,
    px: 0.9, py: 0.3, borderRadius: "4px",
    bgcolor: alpha("#7b1fa2", 0.10),
    border: `1px solid ${alpha("#7b1fa2", 0.28)}`,
    mt: 0.5,
  }}>
    <Edit sx={{ fontSize: 9, color: "#6a1b9a" }} />
    <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color: "#6a1b9a", letterSpacing: "0.04em", fontFamily: T.font }}>
      ADMIN ADDED
    </Typography>
  </Box>
);

// ─── Helpers ───────────────────────────────────────────────────────────────
const deepClone = (arr) => arr.map((r) => ({ ...r }));

const EDITABLE_FIELDS = ["timeIN", "breaktimeIN", "breaktimeOUT", "timeOUT"];
const FIELD_LABELS = {
  timeIN:       "Time IN",
  breaktimeIN:  "Breaktime IN",
  breaktimeOUT: "Breaktime OUT",
  timeOUT:      "Time OUT",
};

const getChanges = (current, saved) => {
  if (!saved) return [];
  return EDITABLE_FIELDS.filter((f) => (current[f] || "") !== (saved[f] || "")).map((f) => ({
    field: f, label: FIELD_LABELS[f],
    before: saved[f] || "—", after: current[f] || "—",
  }));
};

const isDirty = (current, saved) => {
  if (!saved) return false;
  return EDITABLE_FIELDS.some((f) => (current[f] || "") !== (saved[f] || ""));
};

const isWeekend = (dayName) => dayName === "Saturday" || dayName === "Sunday";

const hasAnyTime = (record) =>
  EDITABLE_FIELDS.some((f) => record[f] && String(record[f]).trim() !== "");

const getEmployeeIdentifier = (emp) => {
  if (!emp || typeof emp !== "object") return "";
  const raw =
    emp.personID ??
    emp.PersonID ??
    emp.employeeNum ??
    emp.employeeNumber ??
    emp.agencyEmployeeNum ??
    "";
  return String(raw).trim();
};

// ─── Authorization Dialog ──────────────────────────────────────────────────
const AuthorizationDialog = ({ open, onClose, onConfirm, records, savedRecords, isFullMonth = false }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDiff, setShowDiff]         = useState(true);

  useEffect(() => { if (open) { setAcknowledged(false); setShowDiff(true); } }, [open]);

  const changedRows = isFullMonth
    ? (records || [])
        .filter((rec) => {
          if (rec.isNew) return hasAnyTime(rec);
          const saved = (savedRecords || []).find((s) => s.date === rec.date);
          return saved && isDirty(rec, saved);
        })
        .map((rec) => {
          if (rec.isNew) {
            return {
              date: rec.date, day: rec.Day, isInsert: true,
              changes: EDITABLE_FIELDS
                .filter((f) => rec[f] && String(rec[f]).trim() !== "")
                .map((f) => ({ label: FIELD_LABELS[f], before: "—", after: rec[f] || "—" })),
            };
          }
          const saved = (savedRecords || []).find((s) => s.date === rec.date);
          return { date: rec.date, day: rec.Day, isInsert: false, changes: getChanges(rec, saved) };
        })
        .filter((r) => r.changes.length > 0)
    : (savedRecords || [])
        .map((saved, idx) => {
          const current = records[idx];
          if (!current) return null;
          const changes = getChanges(current, saved);
          if (changes.length === 0) return null;
          return { date: saved.date, day: saved.Day, isInsert: false, changes };
        })
        .filter(Boolean);

  const canConfirm = acknowledged && changedRows.length > 0;

  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden", border: `1.5px solid ${alpha(T.accent, 0.2)}`, boxShadow: `0 20px 60px ${alpha(T.accent, 0.25)}`, fontFamily: T.font } }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{
          px: 3, py: 2.5,
          background: `linear-gradient(135deg, #4a0e0e 0%, ${T.accent} 50%, ${T.accentMid} 100%)`,
          display: "flex", alignItems: "center", gap: 2,
          position: "relative", overflow: "hidden",
        }}>
          <Box sx={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle,rgba(254,249,225,0.1) 0%,transparent 70%)" }} />
          <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "rgba(254,249,225,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid rgba(254,249,225,0.3)", flexShrink: 0, zIndex: 1 }}>
            <AdminPanelSettings sx={{ fontSize: 22, color: "#FEF9E1" }} />
          </Box>
          <Box sx={{ zIndex: 1 }}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "#FEF9E1", lineHeight: 1.2, fontFamily: T.font }}>Confirm Modification</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "rgba(254,249,225,0.75)", mt: 0.3, fontFamily: T.font }}>
              {isFullMonth ? "Full month attendance modification (includes new insertions)" : "Attendance record modification"}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: "#FFFDF5" }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Box
            onClick={() => setShowDiff((p) => !p)}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", px: 2, py: 1.25, borderRadius: "8px",
              bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
              "&:hover": { bgcolor: "rgba(109,35,35,0.10)" }, transition: "all 0.18s",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CompareArrows sx={{ fontSize: 16, color: T.accent }} />
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent, fontFamily: T.font }}>Pending Changes Summary</Typography>
            </Box>
            <Typography sx={{ fontSize: "0.7rem", color: T.faint, fontFamily: T.font }}>{showDiff ? "Hide ▲" : "Show ▼"}</Typography>
          </Box>

          <Collapse in={showDiff}>
            <Box sx={{ mt: 1.5, maxHeight: 260, overflowY: "auto", borderRadius: "8px", border: `1px solid ${T.accentBorder}` }}>
              {changedRows.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <CheckCircle sx={{ color: "#4caf50", fontSize: 36, mb: 1 }} />
                  <Typography sx={{ fontSize: "0.82rem", color: T.muted, fontFamily: T.font }}>No changes detected.</Typography>
                </Box>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {["Date", "Day", "Type", "Field", "Before", "After"].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, color: T.accent, fontSize: "0.72rem", bgcolor: T.accentFaint, py: 1, letterSpacing: "0.05em", fontFamily: T.font }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changedRows.flatMap((row, ri) =>
                      row.changes.map((ch, ci) => (
                        <TableRow key={`${ri}-${ci}`} sx={{ "&:nth-of-type(even)": { bgcolor: "rgba(109,35,35,0.02)" } }}>
                          {ci === 0 && (
                            <>
                              <TableCell rowSpan={row.changes.length} sx={{ fontWeight: 600, color: T.accent, borderRight: `1px solid ${T.divider}`, verticalAlign: "top", pt: 1.5, fontSize: "0.78rem", fontFamily: T.font }}>{row.date}</TableCell>
                              <TableCell rowSpan={row.changes.length} sx={{ color: T.muted, borderRight: `1px solid ${T.divider}`, verticalAlign: "top", pt: 1.5, fontSize: "0.78rem", fontFamily: T.font }}>{row.day}</TableCell>
                              <TableCell rowSpan={row.changes.length} sx={{ verticalAlign: "top", pt: 1.5 }}>
                                <Box sx={{ display: "inline-flex", px: 1, py: 0.25, borderRadius: "4px", bgcolor: row.isInsert ? alpha("#f59e0b", 0.12) : alpha(T.accent, 0.08), border: `1px solid ${row.isInsert ? alpha("#f59e0b", 0.3) : T.accentBorder}` }}>
                                  <Typography sx={{ fontSize: "0.67rem", fontWeight: 800, color: row.isInsert ? "#b45309" : T.accent, fontFamily: T.font }}>{row.isInsert ? "NEW" : "EDIT"}</Typography>
                                </Box>
                              </TableCell>
                            </>
                          )}
                          <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600, color: T.text, fontFamily: T.font }}>{ch.label}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: 0.25, borderRadius: "4px", bgcolor: alpha("#d32f2f", 0.08), border: `1px solid ${alpha("#d32f2f", 0.2)}` }}>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#b71c1c", fontFamily: "monospace" }}>{ch.before}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: 0.25, borderRadius: "4px", bgcolor: alpha("#2e7d32", 0.08), border: `1px solid ${alpha("#2e7d32", 0.2)}` }}>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#1b5e20", fontFamily: "monospace" }}>{ch.after}</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </Box>

        <Box sx={{ px: 3, pt: 2, pb: 2.5 }}>
          <Box sx={{
            p: 2, borderRadius: "8px",
            border: `1.5px solid ${acknowledged ? alpha("#2e7d32", 0.35) : T.accentBorder}`,
            bgcolor: acknowledged ? alpha("#2e7d32", 0.04) : T.accentFaint,
            transition: "all 0.25s ease",
          }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  sx={{ color: T.accent, "&.Mui-checked": { color: "#2e7d32" }, "& .MuiSvgIcon-root": { fontSize: 20 } }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 500, color: T.text, lineHeight: 1.6, fontFamily: T.font }}>
                  I hereby confirm that the above attendance records are accurate and formally authorize the requested modifications. I acknowledge full responsibility for the accuracy and validity of these changes.
                </Typography>
              }
              sx={{ alignItems: "flex-start", "& .MuiFormControlLabel-label": { mt: 0.3 } }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: "#FFFDF5", borderTop: `1px solid ${T.divider}`, gap: 1.5 }}>
        <RowBtn
          icon={<Cancel sx={{ fontSize: 13 }} />}
          label="Cancel"
          onClick={onClose}
          color="#C62828"
          hoverBg="rgba(198,40,40,0.08)"
        />
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          style={{
            flex: 1,
            background: canConfirm ? "linear-gradient(135deg,#2e7d32 0%,#388e3c 100%)" : "rgba(0,0,0,0.08)",
            border: "none", borderRadius: "8px",
            padding: "10px 20px", cursor: canConfirm ? "pointer" : "not-allowed",
            color: canConfirm ? "#fff" : "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontSize: "0.82rem", fontWeight: 700, fontFamily: T.font,
            transition: "all 0.18s", boxShadow: canConfirm ? "0 4px 14px rgba(46,125,50,0.3)" : "none",
          }}
          onMouseEnter={(e) => { if (canConfirm) e.currentTarget.style.background = "linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%)"; }}
          onMouseLeave={(e) => { if (canConfirm) e.currentTarget.style.background = "linear-gradient(135deg,#2e7d32 0%,#388e3c 100%)"; }}
        >
          <VerifiedUser sx={{ fontSize: 15 }} />
          Confirm &amp; Save Changes
        </button>
      </DialogActions>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE AUTOCOMPLETE — debounced, lazy load, mirrors OfficialTimeForm
// ─────────────────────────────────────────────────────────────────────────────
const EmployeeSearchField = ({ onSelect, selectedEmployee, onClear, disabled = false }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync query when employee is cleared externally
  useEffect(() => {
    if (!selectedEmployee) setQuery("");
    else setQuery(selectedEmployee.name || "");
  }, [selectedEmployee]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setResults(r.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByQuery = useCallback(async (q) => {
    setLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setResults(r.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);

    // If user typed after selection, clear it
    if (selectedEmployee) {
      onClear();
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length === 0) fetchAll();
      else if (val.trim().length >= 2) fetchByQuery(val.trim());
      else setResults([]);
    }, 300);
  };

  const handleFocus = () => {
    setOpen(true);
    if (!results.length && !loading) {
      query.trim().length >= 2 ? fetchByQuery(query.trim()) : fetchAll();
    }
  };

  const handleSelect = (emp) => {
    const resolvedId = getEmployeeIdentifier(emp);
    setQuery(resolvedId || emp.name || "");
    setOpen(false);
    onSelect(emp);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onClear();
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }} ref={dropdownRef}>
      <ModernTextField
        inputRef={inputRef}
        fullWidth
        size="small"
        placeholder="Type name or employee number…"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        disabled={disabled}
        autoComplete="off"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person sx={{ color: T.accentMid, fontSize: 18 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={14} sx={{ color: T.accent }} />
              ) : selectedEmployee ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: T.faint }} />
                </IconButton>
              ) : (
                <IconButton
                  size="small"
                  onClick={() => {
                    setOpen((o) => !o);
                    if (!open && !results.length) fetchAll();
                  }}
                  sx={{ p: 0.25 }}
                >
                  {open ? (
                    <ExpandLess sx={{ fontSize: 16, color: T.faint }} />
                  ) : (
                    <ExpandMore sx={{ fontSize: 16, color: T.faint }} />
                  )}
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderColor: selectedEmployee ? T.accent : undefined,
            "& fieldset": selectedEmployee
              ? { borderColor: T.accent, borderWidth: 1.5 }
              : {},
          },
        }}
      />

      {open && (
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1400,
            maxHeight: 260,
            overflow: "auto",
            mt: 0.5,
            borderRadius: "10px",
            border: `1px solid ${T.accentBorder}`,
            "&::-webkit-scrollbar": { width: "5px" },
            "&::-webkit-scrollbar-thumb": { background: "#d0b8b8", borderRadius: "4px" },
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 2.5,
              }}
            >
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: "0.8rem", color: T.muted }}>
                Searching…
              </Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding>
              {results.map((emp) => (
                <ListItem
                  key={emp.employeeNumber}
                  button
                  onClick={() => handleSelect(emp)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderBottom: `1px solid ${T.divider}`,
                    "&:hover": { bgcolor: T.accentFaint },
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 30,
                        height: 30,
                        fontSize: "0.72rem",
                        bgcolor: alpha(T.accent, 0.15),
                        color: T.accent,
                        fontWeight: 700,
                      }}
                    >
                      {emp.name?.charAt(0)?.toUpperCase() || "?"}
                    </Avatar>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "0.83rem",
                          fontWeight: 700,
                          color: T.text,
                          lineHeight: 1.2,
                        }}
                      >
                        {emp.name}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                        #{getEmployeeIdentifier(emp)}
                        {emp.department ? ` · ${emp.department}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.8rem", color: T.faint, fontStyle: "italic" }}>
                {query.length >= 2 ? `No results for "${query}"` : "Type to search or browse"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceSearch = () => {
  const { settings } = useSystemSettings();
  const INITIAL_VISIBLE_ROWS = 60;
  const VISIBLE_ROWS_STEP = 60;

  const today          = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { hasAccess, loading: accessLoading } = usePageAccess("search-attendance");

  // ── Shared filter state ──
  const [personID, setPersonID]   = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState("records");

  // ── Records-only tab state ──
  const [records, setRecords]                         = useState([]);
  const [savedRecords, setSavedRecords]               = useState([]);
  const [everModifiedFields, setEverModifiedFields]   = useState(new Set());

  // ── Full-month tab state ──
  const [fullRecords, setFullRecords]             = useState([]);
  const [savedFullRecords, setSavedFullRecords]   = useState([]);
  const [fullEverModified, setFullEverModified]   = useState(new Set());

  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [recordsVisibleCount, setRecordsVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  const [fullVisibleCount, setFullVisibleCount] = useState(INITIAL_VISIBLE_ROWS);

  // ── UI state ──
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [submittedID, setSubmittedID]     = useState("");
  const [hasSearched, setHasSearched]     = useState(false);
  const [pageLoading, setPageLoading]     = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [snackbar, setSnackbar]           = useState({ open: false, message: "", severity: "success" });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const resultsRef    = useRef(null);
  const fullResultsRef = useRef(null);
  const recordsControllerRef = useRef(null);
  const fullControllerRef = useRef(null);
  const recordsCacheRef = useRef(new Map());
  const fullCacheRef = useRef(new Map());

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  const visibleRecords = useMemo(
    () => records.slice(0, recordsVisibleCount),
    [records, recordsVisibleCount]
  );
  const visibleFullRecords = useMemo(
    () => fullRecords.slice(0, fullVisibleCount),
    [fullRecords, fullVisibleCount]
  );

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
    setSnackbarCountdown(6);
  };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  };

  // ── Fetch: Records-only ──────────────────────────────────────────────────
  const fetchRecords = async (showLoading = true, { force = false } = {}) => {
    if (!personID || !startDate || !endDate) return;
    const normalizedPersonID = String(personID || "").trim();
    const cacheKey = `${normalizedPersonID}|${startDate}|${endDate}`;
    setSubmittedID(normalizedPersonID);
    setHasSearched(true);

    if (!force && recordsCacheRef.current.has(cacheKey)) {
      const cached = recordsCacheRef.current.get(cacheKey) || [];
      setRecords(cached);
      setSavedRecords(deepClone(cached));
      setLoadedTabs((prev) => new Set([...prev, "records"]));
      setLoading(false);
      return;
    }

    if (recordsControllerRef.current) recordsControllerRef.current.abort();
    const controller = new AbortController();
    recordsControllerRef.current = controller;

    if (showLoading) setLoading(true);
    setError(""); setSuccess("");
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID: normalizedPersonID, startDate, endDate },
        { ...getAuthHeaders(), signal: controller.signal }
      );
      const fetched = response.data;
      recordsCacheRef.current.set(cacheKey, fetched);
      if (recordsCacheRef.current.size > 20) {
        const firstKey = recordsCacheRef.current.keys().next().value;
        recordsCacheRef.current.delete(firstKey);
      }
      setRecords(fetched);
      setSavedRecords(deepClone(fetched));
      setEverModifiedFields(new Set());
      setLoadedTabs((prev) => new Set([...prev, "records"]));
      if (fetched.length > 0) {
        requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      const msg = "Failed to fetch attendance records. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      if (showLoading && recordsControllerRef.current === controller) setLoading(false);
    }
  };

  // ── Fetch: Full-month (all days) ─────────────────────────────────────────
  const fetchFullRecords = async (showLoading = true, { force = false } = {}) => {
    if (!personID || !startDate || !endDate) return;
    const normalizedPersonID = String(personID || "").trim();
    const cacheKey = `${normalizedPersonID}|${startDate}|${endDate}`;
    setSubmittedID(normalizedPersonID);
    setHasSearched(true);

    if (!force && fullCacheRef.current.has(cacheKey)) {
      const cached = fullCacheRef.current.get(cacheKey) || [];
      setFullRecords(cached);
      setSavedFullRecords(deepClone(cached));
      setLoadedTabs((prev) => new Set([...prev, "fullMonth"]));
      setLoading(false);
      return;
    }

    if (fullControllerRef.current) fullControllerRef.current.abort();
    const controller = new AbortController();
    fullControllerRef.current = controller;

    if (showLoading) setLoading(true);
    setError(""); setSuccess("");
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance-full`,
        { personID: normalizedPersonID, startDate, endDate },
        { ...getAuthHeaders(), signal: controller.signal }
      );
      const fetched = response.data;
      fullCacheRef.current.set(cacheKey, fetched);
      if (fullCacheRef.current.size > 20) {
        const firstKey = fullCacheRef.current.keys().next().value;
        fullCacheRef.current.delete(firstKey);
      }
      setFullRecords(fetched);
      setSavedFullRecords(deepClone(fetched));
      // NOTE: fullEverModified is intentionally NOT reset here so saved
      // modification indicators persist after re-fetch. It is reset only
      // when filters change (see filter useEffect below).
      setLoadedTabs((prev) => new Set([...prev, "fullMonth"]));
      if (fetched.length > 0) {
        requestAnimationFrame(() => fullResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      const msg = "Failed to fetch full-month attendance records. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      if (showLoading && fullControllerRef.current === controller) setLoading(false);
    }
  };

  // When filters change, reset everything and fetch only the active tab.
  useEffect(() => {
    if (!personID || !startDate || !endDate) return;
    setRecords([]); setSavedRecords([]); setEverModifiedFields(new Set());
    setFullRecords([]); setSavedFullRecords([]); setFullEverModified(new Set());
    setLoadedTabs(new Set());
    setRecordsVisibleCount(INITIAL_VISIBLE_ROWS);
    setFullVisibleCount(INITIAL_VISIBLE_ROWS);
    setHasSearched(true);
    setSubmittedID(String(personID || "").trim());

    const timer = setTimeout(() => {
      if (activeTab === "records") fetchRecords(true, { force: true });
      else fetchFullRecords(true, { force: true });
    }, 180);
    return () => clearTimeout(timer);
  }, [personID, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      recordsControllerRef.current?.abort();
      fullControllerRef.current?.abort();
    };
  }, []);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === "records") setRecordsVisibleCount(INITIAL_VISIBLE_ROWS);
    if (tab === "fullMonth") setFullVisibleCount(INITIAL_VISIBLE_ROWS);
    if (!personID || !startDate || !endDate) return;
    if (tab === "records" && !loadedTabs.has("records")) fetchRecords(true);
    if (tab === "fullMonth" && !loadedTabs.has("fullMonth")) fetchFullRecords(true);
  };

  const handleRefresh = () => {
    if (activeTab === "records") {
      setLoadedTabs((prev) => { const s = new Set(prev); s.delete("records"); return s; });
      fetchRecords(true, { force: true });
    } else {
      setLoadedTabs((prev) => { const s = new Set(prev); s.delete("fullMonth"); return s; });
      fetchFullRecords(true, { force: true });
    }
  };

  // ── Save: Records-only ───────────────────────────────────────────────────
  // FIX: re-fetch from server after save so UI reflects actual saved data,
  // including any server-side formatting or computed fields.
  const saveAll = async () => {
    setAuthDialogOpen(false);
    try {
      setLoading(true); setError(""); setSuccess("");
      const response = await axios.put(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { records },
        getAuthHeaders()
      );
      const msg = response.data.message || "Records saved successfully!";
      setSuccess(msg);
      showSnackbar(msg, "success");

      // Build the modSet BEFORE re-fetching so indicators survive the fetch.
      const modSet = new Set();
      records.forEach((rec, i) => {
        EDITABLE_FIELDS.forEach((f) => {
          if ((rec[f] || "") !== (savedRecords[i]?.[f] || ""))
            modSet.add(`${rec.personID}-${rec.date}-${f}`);
        });
      });

      // Re-fetch fresh server data (this resets everModifiedFields to new Set inside).
      await fetchRecords(false, { force: true });

      // Re-apply modSet AFTER fetch so green indicators show correctly.
      setEverModifiedFields(modSet);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save records. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Save: Full-month ─────────────────────────────────────────────────────
  // FIX: build modSet before fetching, then apply it after so it isn't
  // wiped by the fetch's internal state resets.
  const saveFullMonth = async () => {
    setAuthDialogOpen(false);

    const toSave = fullRecords.filter((rec) => {
      if (rec.isNew) return hasAnyTime(rec);
      const saved = savedFullRecords.find((s) => s.date === rec.date);
      return saved && isDirty(rec, saved);
    });

    if (toSave.length === 0) {
      showSnackbar("No changes to save.", "info");
      return;
    }

    try {
      setLoading(true); setError(""); setSuccess("");
      const response = await axios.put(
        `${API_BASE_URL}/attendance/api/view-attendance-full`,
        { records: toSave },
        getAuthHeaders()
      );
      const msg = response.data.message || "Records saved successfully!";
      setSuccess(msg);
      showSnackbar(msg, "success");

      // Build modSet BEFORE the re-fetch resets internal state.
      const modSet = new Set(fullEverModified);
      toSave.forEach((rec) => {
        EDITABLE_FIELDS.forEach((f) => {
          if (rec[f] && String(rec[f]).trim() !== "") modSet.add(`${rec.date}-${f}`);
        });
      });

      // Re-fetch fresh data from server.
      await fetchFullRecords(false, { force: true });

      // Re-apply modSet AFTER fetch so green indicators are not wiped.
      setFullEverModified(modSet);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save records. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((index, field, value) => {
    const updated = [...records];
    updated[index] = { ...updated[index], [field]: value };
    setRecords(updated);
  }, [records]);

  const handleFullInputChange = useCallback((index, field, value) => {
    const updated = [...fullRecords];
    updated[index] = { ...updated[index], [field]: value };
    setFullRecords(updated);
  }, [fullRecords]);

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setPersonID(""); setSelectedEmployee(null); setStartDate(""); setEndDate("");
    setRecords([]); setSavedRecords([]); setEverModifiedFields(new Set());
    setFullRecords([]); setSavedFullRecords([]); setFullEverModified(new Set());
    setError(""); setSuccess(""); setSelectedMonth(null);
    setLoadedTabs(new Set());
    setRecordsVisibleCount(INITIAL_VISIBLE_ROWS);
    setFullVisibleCount(INITIAL_VISIBLE_ROWS);
    setSubmittedID(""); setHasSearched(false); setLoading(false);
    recordsCacheRef.current.clear();
    fullCacheRef.current.clear();
    recordsControllerRef.current?.abort();
    fullControllerRef.current?.abort();
  };

  const recordsCount   = records.length;
  const fullDaysCount  = fullRecords.length;
  const missingCount   = fullRecords.filter((r) => r.isNew).length;

  if (pageLoading || accessLoading) return <AttendanceSearchWireframe />;
  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance Modification. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        width: "100vw", maxWidth: "100%",
        position: "relative", left: "63%", transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
        fontFamily: T.font,
      }}>
        <style>{shimmerKf}</style>

        <AuthorizationDialog
          open={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          onConfirm={activeTab === "records" ? saveAll : saveFullMonth}
          records={activeTab === "records" ? records : fullRecords}
          savedRecords={activeTab === "records" ? savedRecords : savedFullRecords}
          isFullMonth={activeTab === "fullMonth"}
        />
        

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%", fontWeight: 600, fontFamily: T.font, backgroundColor: snackbar.severity === "success" ? "#4caf50" : undefined, color: snackbar.severity === "success" ? "#ffffff" : undefined, "& .MuiAlert-icon": { color: snackbar.severity === "success" ? "#ffffff" : undefined } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip label={`${snackbarCountdown}s`} size="small" sx={{ backgroundColor: snackbar.severity === "success" ? "rgba(255,255,255,0.3)" : undefined, color: snackbar.severity === "success" ? "#ffffff" : undefined, fontWeight: 700, fontFamily: T.font }} />
              )}
            </Box>
          </Alert>
        </Snackbar>   

          {/* <Backdrop
          sx={{
            color: "#FEF9E1",
            zIndex: 9999,
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
          }}
          open={loading}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={52} thickness={4} />
            <Typography sx={{ mt: 2, color: "#FEF9E1", fontWeight: 600, fontSize: "0.95rem", fontFamily: T.font }}>
              Processing attendance records...
            </Typography>
          </Box>
        </Backdrop> */}

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative", overflow: "hidden",
          }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)" }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
              <Edit sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25, fontFamily: T.font }}>
                  Attendance Management
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.accentMid, fontWeight: 600, fontFamily: T.font }}>
                  Admin Portal · Review and manage attendance records
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.accent, fontWeight: 700, fontFamily: T.font }}>Editable Records</Typography>
              </Box>
              <button
                onClick={handleRefresh}
                disabled={!personID || !startDate || !endDate}
                style={{
                  background: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`,
                  borderRadius: "8px", padding: "7px 10px",
                  cursor: (!personID || !startDate || !endDate) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "5px",
                  color: T.accent, fontSize: "0.75rem", fontWeight: 700,
                  fontFamily: T.font, transition: "all 0.15s",
                  opacity: (!personID || !startDate || !endDate) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (personID && startDate && endDate) e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14); }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08); }}
              >
                <Refresh sx={{ fontSize: 15 }} />
                Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>

        <Collapse in={!!error}>
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem", fontFamily: T.font }}>{error}</Alert>
        </Collapse>
        <Collapse in={!!success}>
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem", fontFamily: T.font }}>{success}</Alert>
        </Collapse>

        {/* ── Controls Card ── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: T.font }}>
                    Employee Number
                  </Typography>
                  <EmployeeSearchField
                    onSelect={(emp) => {
                      const resolvedEmployeeId = getEmployeeIdentifier(emp);
                      setSelectedEmployee(emp);
                      setPersonID(resolvedEmployeeId);
                    }}
                    selectedEmployee={selectedEmployee}
                    onClear={() => {
                      setSelectedEmployee(null);
                      setPersonID("");
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: T.font }}>
                    Start Date
                  </Typography>
                  <NativeInput
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    icon={<CalendarToday sx={{ fontSize: 15, color: T.accentBorder }} />}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: T.font }}>
                    End Date
                  </Typography>
                  <NativeInput
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    icon={<CalendarToday sx={{ fontSize: 15, color: T.accentBorder }} />}
                  />
                </Box>
            </Box>

            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 0.75, fontFamily: T.font }}>
              <FilterList sx={{ fontSize: 13 }} />Quick Date Selection
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5 }}>
              {[
                { label: "Today",        icon: <Today sx={{ fontSize: 13 }} />,        fn: () => { setStartDate(formattedToday); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: "Yesterday",    icon: <ArrowBackIos sx={{ fontSize: 11 }} />, fn: () => { const y = new Date(today); y.setDate(y.getDate() - 1); const s = y.toISOString().substring(0, 10); setStartDate(s); setEndDate(s); setSelectedMonth(null); } },
                { label: "Last 7 Days",  icon: null, fn: () => { const d = new Date(today); d.setDate(d.getDate() - 7); setStartDate(d.toISOString().substring(0, 10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: "Last 15 Days", icon: null, fn: () => { const d = new Date(today); d.setDate(d.getDate() - 15); setStartDate(d.toISOString().substring(0, 10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: "Last 30 Days", icon: null, fn: () => { const d = new Date(today); d.setMonth(d.getMonth() - 1); setStartDate(d.toISOString().substring(0, 10)); setEndDate(formattedToday); setSelectedMonth(null); } },
              ].map(({ label, icon, fn }) => (
                <QuickBtn key={label} label={label} icon={icon} onClick={fn} />
              ))}
            </Box>

            <Box sx={{ p: 2.5, borderRadius: 2, border: `2px dashed ${T.accentBorder}`, bgcolor: T.accentFaint }}>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent, mb: 0.3, fontFamily: T.font }}>Select Entire Month</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.font }}>Choose a year, then click any month to set the date range</Typography>
                </Box>
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: "0.8rem", fontFamily: T.font }}>Year</InputLabel>
                  <Select
                    value={selectedYear} label="Year"
                    onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth(null); showSnackbar("Year changed — please click a month to load records.", "info"); }}
                    sx={{ bgcolor: "#fff", borderRadius: 2, fontWeight: 600, fontSize: "0.85rem", fontFamily: T.font, "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder } }}
                  >
                    {yearOptions.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: "0.85rem", fontFamily: T.font }}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center" }}>
                {months.map((month, index) => {
                  const sel = selectedMonth === index;
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthClick(index)}
                      style={{
                        background: sel ? T.accent : "#fff",
                        border: `1px solid ${sel ? T.accent : T.accentBorder}`,
                        borderRadius: "6px", padding: "7px 14px", cursor: "pointer",
                        color: sel ? "#fff" : T.accent,
                        fontSize: "0.75rem", fontWeight: 700, fontFamily: T.font,
                        transition: "all 0.15s ease",
                        boxShadow: sel ? `0 2px 8px ${alpha(T.accent, 0.25)}` : "none",
                        letterSpacing: "0.04em",
                      }}
                      onMouseEnter={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; } }}
                      onMouseLeave={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = T.accentBorder; } }}
                    >
                      {month}
                    </button>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <RowBtn
                icon={<Clear sx={{ fontSize: 13 }} />}
                label="Clear All Filters"
                color="#C62828" hoverBg="rgba(198,40,40,0.08)"
                onClick={handleClearFilters}
              />
            </Box>

            {loading && (
              <Box sx={{ mt: 1.5 }}>
                <LinearProgress
                  sx={{
                    height: 3,
                    borderRadius: 999,
                    bgcolor: alpha(T.accent, 0.08),
                    "& .MuiLinearProgress-bar": { bgcolor: T.accent },
                  }}
                />
              </Box>
            )}
          </Box>
        </SectionCard>

        {/* ── Tab Switcher + Results ── */}
        {hasSearched && submittedID && startDate && endDate && (
          <Fade in timeout={400}>
            <Box>
              {/* Tab bar */}
              <Box sx={{
                display: "flex", alignItems: "flex-end", gap: 0.5,
                borderBottom: `1px solid ${T.divider}`, mb: 0,
                px: 0.5,
              }}>
                <TabBtn
                  active={activeTab === "records"}
                  icon={TableRows}
                  label="Records Only"
                  badge={recordsCount > 0 ? recordsCount : null}
                  onClick={() => handleTabSwitch("records")}
                />
                <TabBtn
                  active={activeTab === "fullMonth"}
                  icon={EventNote}
                  label="Full Month View"
                  badge={fullDaysCount > 0 ? fullDaysCount : null}
                  onClick={() => handleTabSwitch("fullMonth")}
                />
                {activeTab === "fullMonth" && missingCount > 0 && (
                  <Box sx={{ ml: 1, mb: 0.5, display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.3, borderRadius: 5, bgcolor: alpha("#f59e0b", 0.12), border: `1px solid ${alpha("#f59e0b", 0.3)}` }}>
                    <AddCircleOutline sx={{ fontSize: 12, color: "#b45309" }} />
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#b45309", fontFamily: T.font }}>
                      {missingCount} missing {missingCount === 1 ? "day" : "days"}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* ══ TAB 1: Records Only ═══════════════════════════════════════════════ */}
              {activeTab === "records" && records.length > 0 && (
                <SectionCard sx={{ mb: 2, borderRadius: "0 12px 12px 12px" }} ref={resultsRef}>
                  <PanelHeader
                    icon={Edit}
                    title={`Records for ${personID}`}
                    right={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.font }}>{startDate} → {endDate}</Typography>
                        <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                          <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700, fontFamily: T.font }}>
                            {records.length} {records.length === 1 ? "record" : "records"}
                          </Typography>
                        </Box>
                        <button
                          onClick={() => setAuthDialogOpen(true)}
                          disabled={loading}
                          style={{
                            background: loading ? T.accentFaint : T.accent,
                            border: `1px solid ${loading ? T.accentBorder : T.accent}`,
                            borderRadius: "6px", padding: "5px 12px",
                            cursor: loading ? "not-allowed" : "pointer",
                            color: loading ? T.accentMid : "#fff",
                            display: "flex", alignItems: "center", gap: "5px",
                            fontSize: "0.72rem", fontWeight: 700, fontFamily: T.font,
                            transition: "all 0.15s", opacity: loading ? 0.65 : 1,
                          }}
                          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accentDark; }}
                          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accent; }}
                        >
                          <SaveAs sx={{ fontSize: 13 }} />
                          Save Changes
                        </button>
                      </Box>
                    }
                  />

                  {/* Legend */}
                  <Box sx={{ px: 2.5, py: 1, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "center" }}>
                    {[
                      { color: "#e65100", label: "Unsaved changes" },
                      { color: "#2e7d32", label: "Saved modifications" },
                      { color: "#7b1fa2", label: "Admin added (no device record)" },
                    ].map(({ color, label }) => (
                      <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.font }}>{label}</Typography>
                      </Box>
                    ))}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, ml: "auto" }}>
                      <Typography sx={{ fontSize: "0.66rem", color: T.faint, fontStyle: "italic", fontFamily: T.font }}>
                        💡 Type digits only — colons auto-insert · Click <strong>AM</strong>/<strong>PM</strong> to toggle
                      </Typography>
                    </Box>
                  </Box>

                  {/* Column headers */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 1.6fr 1.6fr 1.6fr 1.6fr", px: 2.5, py: 1.25, bgcolor: T.accent, gap: 2, position: "sticky", top: 0, zIndex: 2 }}>
                    {["EMPLOYEE #", "DATE", "DAY", "TIME IN", "BREAKTIME IN", "BREAKTIME OUT", "TIME OUT"].map((col) => (
                      <Typography key={col} sx={{ color: "#fff", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", fontFamily: T.font }}>{col}</Typography>
                    ))}
                  </Box>

                  {/* Rows */}
                  <Box sx={{ maxHeight: 520, overflowY: "auto", overflowX: "auto" }}>
                    {visibleRecords.map((record, index) => (
                      <RecordsRow
                        key={`${record.personID}-${record.date}-${index}`}
                        record={record}
                        savedRecord={savedRecords[index]}
                        index={index}
                        everModifiedFields={everModifiedFields}
                        onFieldChange={handleInputChange}
                      />
                    ))}

                    {records.length > recordsVisibleCount && (
                      <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.divider}`, bgcolor: "#fff", display: "flex", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => setRecordsVisibleCount((p) => Math.min(records.length, p + VISIBLE_ROWS_STEP))}
                          style={{
                            background: alpha(T.accent, 0.08),
                            border: `1px solid ${T.accentBorder}`,
                            borderRadius: "8px",
                            padding: "8px 14px",
                            cursor: "pointer",
                            color: T.accent,
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            fontFamily: T.font,
                          }}
                        >
                          Load more records ({records.length - recordsVisibleCount} remaining)
                        </button>
                      </Box>
                    )}
                  </Box>
                </SectionCard>
              )}

              {activeTab === "records" && records.length === 0 && !loading && (
                <SectionCard sx={{ mb: 2, borderRadius: "0 12px 12px 12px" }} ref={resultsRef}>
                  <PanelHeader
                    icon={Edit}
                    title={`Records for ${submittedID}`}
                    right={<Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.font }}>{startDate} → {endDate}</Typography>}
                  />
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <EventNote sx={{ fontSize: 40, color: T.accentBorder, mb: 1 }} />
                    <Typography sx={{ fontSize: "0.86rem", color: T.muted, fontFamily: T.font }}>
                      No records found for this employee and date range.
                    </Typography>
                  </Box>
                </SectionCard>
              )}

              {/* ══ TAB 2: Full Month View ════════════════════════════════════════════ */}
              {activeTab === "fullMonth" && fullRecords.length > 0 && (
                <SectionCard sx={{ mb: 2, borderRadius: "0 12px 12px 12px" }} ref={fullResultsRef}>
                  <PanelHeader
                    icon={EventNote}
                    title={`Full Month View — ${personID}`}
                    right={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.font }}>{startDate} → {endDate}</Typography>
                        <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                          <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700, fontFamily: T.font }}>
                            {fullDaysCount - missingCount} / {fullDaysCount} days
                          </Typography>
                        </Box>
                        {missingCount > 0 && (
                          <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha("#f59e0b", 0.12), border: `1px solid ${alpha("#f59e0b", 0.3)}` }}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#b45309", fontWeight: 700, fontFamily: T.font }}>
                              {missingCount} no record
                            </Typography>
                          </Box>
                        )}
                        <button
                          onClick={() => setAuthDialogOpen(true)}
                          disabled={loading}
                          style={{
                            background: loading ? T.accentFaint : T.accent,
                            border: `1px solid ${loading ? T.accentBorder : T.accent}`,
                            borderRadius: "6px", padding: "5px 12px",
                            cursor: loading ? "not-allowed" : "pointer",
                            color: loading ? T.accentMid : "#fff",
                            display: "flex", alignItems: "center", gap: "5px",
                            fontSize: "0.72rem", fontWeight: 700, fontFamily: T.font,
                            transition: "all 0.15s", opacity: loading ? 0.65 : 1,
                          }}
                          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accentDark; }}
                          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accent; }}
                        >
                          <SaveAs sx={{ fontSize: 13 }} />
                          Save Changes
                        </button>
                      </Box>
                    }
                  />

                  {/* Legend */}
                  <Box sx={{ px: 2.5, py: 1, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "center" }}>
                    {[
                      { color: "#f59e0b", label: "No existing record — type to create" },
                      { color: "#e65100", label: "Unsaved changes" },
                      { color: "#2e7d32", label: "Saved modifications" },
                      { color: T.accentMid, label: "Weekend" },
                    ].map(({ color, label }) => (
                      <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.font }}>{label}</Typography>
                      </Box>
                    ))}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, ml: "auto" }}>
                      <Typography sx={{ fontSize: "0.66rem", color: T.faint, fontStyle: "italic", fontFamily: T.font }}>
                        💡 Type digits only — colons auto-insert · Click <strong>AM</strong>/<strong>PM</strong> to toggle
                      </Typography>
                    </Box>
                  </Box>

                  {/* Column headers */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "0.6fr 1fr 0.8fr 1.6fr 1.6fr 1.6fr 1.6fr", px: 2.5, py: 1.25, bgcolor: T.accent, gap: 2, position: "sticky", top: 0, zIndex: 2 }}>
                    {["STATUS", "DATE", "DAY", "TIME IN", "BREAKTIME IN", "BREAKTIME OUT", "TIME OUT"].map((col) => (
                      <Typography key={col} sx={{ color: "#fff", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", fontFamily: T.font }}>{col}</Typography>
                    ))}
                  </Box>

                  {/* Rows */}
                  <Box sx={{ maxHeight: 580, overflowY: "auto", overflowX: "auto" }}>
                    {visibleFullRecords.map((record, index) => (
                      <FullMonthRow
                        key={`${record.date}-${index}`}
                        record={record}
                        savedRow={savedFullRecords[index]}
                        index={index}
                        fullEverModified={fullEverModified}
                        onFieldChange={handleFullInputChange}
                      />
                    ))}

                    {fullRecords.length > fullVisibleCount && (
                      <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.divider}`, bgcolor: "#fff", display: "flex", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => setFullVisibleCount((p) => Math.min(fullRecords.length, p + VISIBLE_ROWS_STEP))}
                          style={{
                            background: alpha(T.accent, 0.08),
                            border: `1px solid ${T.accentBorder}`,
                            borderRadius: "8px",
                            padding: "8px 14px",
                            cursor: "pointer",
                            color: T.accent,
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            fontFamily: T.font,
                          }}
                        >
                          Load more days ({fullRecords.length - fullVisibleCount} remaining)
                        </button>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderTop: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1 }}>
                    <AddCircleOutline sx={{ fontSize: 13, color: T.accentMid }} />
                    <Typography sx={{ fontSize: "0.7rem", color: T.muted, fontFamily: T.font }}>
                      Type times into any <strong style={{ color: "#92400e" }}>NO RECORD</strong> row to create a new attendance entry for that day.
                    </Typography>
                  </Box>
                </SectionCard>
              )}

              {activeTab === "fullMonth" && fullRecords.length === 0 && !loading && personID && startDate && endDate && (
                <SectionCard sx={{ mb: 2, borderRadius: "0 12px 12px 12px" }}>
                  <Box sx={{ py: 5, textAlign: "center" }}>
                    <EventNote sx={{ fontSize: 40, color: T.accentBorder, mb: 1 }} />
                    <Typography sx={{ fontSize: "0.85rem", color: T.muted, mb: 1.5, fontFamily: T.font }}>
                      No calendar data loaded yet.
                    </Typography>
                    <button
                      onClick={() => fetchFullRecords(true)}
                      style={{
                        background: T.accent, border: "none", borderRadius: "8px",
                        padding: "9px 20px", cursor: "pointer", color: "#fff",
                        fontSize: "0.8rem", fontWeight: 700, fontFamily: T.font,
                      }}
                    >
                      Load Full Month
                    </button>
                  </Box>
                </SectionCard>
              )}
            </Box>
          </Fade>
        )}

        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{ position: "fixed", bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

      </Box>
    </Fade>
  );
};

export default AttendanceSearch;