import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  Box,
  Typography,
  Card,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  Fade,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { AccessTime as ClockIcon, Save as SaveIcon } from "@mui/icons-material";

// ─── Theme tokens (identical to LeaveAssignment) ──────────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  headerGrad: "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  rowEven: "#ffffff",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
  poppins: "'Poppins', sans-serif",
};

// ─── Styled primitives (matching LeaveAssignment) ─────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#ffffff",
});

// FieldInput — matches LeaveAssignment exactly
const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
    "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: T.text },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.875rem",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

// ─── Static data ──────────────────────────────────────────────────────────────
const DEFAULT_HOURS_8 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "8hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
}));
const DEFAULT_HOURS_6 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "6hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
}));
const DEFAULT_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  rate_type: "minute",
  day_type: "minute",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
}));

const DEFAULT_LWP_TABLE = [
  { d: 1, e: 0.042 },
  { d: 2, e: 0.083 },
  { d: 3, e: 0.125 },
  { d: 4, e: 0.167 },
  { d: 5, e: 0.208 },
  { d: 6, e: 0.25 },
  { d: 7, e: 0.292 },
  { d: 8, e: 0.333 },
  { d: 9, e: 0.375 },
  { d: 10, e: 0.417 },
  { d: 11, e: 0.458 },
  { d: 12, e: 0.5 },
  { d: 13, e: 0.542 },
  { d: 14, e: 0.583 },
  { d: 15, e: 0.625 },
  { d: 16, e: 0.667 },
  { d: 17, e: 0.708 },
  { d: 18, e: 0.75 },
  { d: 19, e: 0.792 },
  { d: 20, e: 0.833 },
  { d: 21, e: 0.875 },
  { d: 22, e: 0.917 },
  { d: 23, e: 0.958 },
  { d: 24, e: 1.0 },
  { d: 25, e: 1.042 },
  { d: 26, e: 1.083 },
  { d: 27, e: 1.125 },
  { d: 28, e: 1.167 },
  { d: 29, e: 1.208 },
  { d: 30, e: 1.25 },
];

const DEFAULT_ABS_TABLE = [
  { a: 0.5, e: 1.229 },
  { a: 1.0, e: 1.208 },
  { a: 1.5, e: 1.188 },
  { a: 2.0, e: 1.167 },
  { a: 2.5, e: 1.146 },
  { a: 3.0, e: 1.125 },
  { a: 3.5, e: 1.104 },
  { a: 4.0, e: 1.083 },
  { a: 4.5, e: 1.063 },
  { a: 5.0, e: 1.042 },
  { a: 5.5, e: 1.021 },
  { a: 6.0, e: 1.0 },
  { a: 6.5, e: 0.979 },
  { a: 7.0, e: 0.958 },
  { a: 7.5, e: 0.938 },
  { a: 8.0, e: 0.917 },
  { a: 8.5, e: 0.854 },
  { a: 9.0, e: 0.833 },
  { a: 9.5, e: 0.875 },
  { a: 10.0, e: 0.833 },
  { a: 10.5, e: 0.813 },
  { a: 11.0, e: 0.792 },
  { a: 11.5, e: 0.771 },
  { a: 12.0, e: 0.75 },
  { a: 12.5, e: 0.729 },
  { a: 13.0, e: 0.708 },
  { a: 13.5, e: 0.687 },
  { a: 14.0, e: 0.667 },
  { a: 14.5, e: 0.646 },
  { a: 15.0, e: 0.625 },
  { a: 15.5, e: 0.604 },
  { a: 16.0, e: 0.583 },
  { a: 16.5, e: 0.562 },
  { a: 17.0, e: 0.542 },
  { a: 17.5, e: 0.521 },
  { a: 18.0, e: 0.5 },
  { a: 18.5, e: 0.479 },
  { a: 19.0, e: 0.458 },
  { a: 19.5, e: 0.437 },
  { a: 20.0, e: 0.417 },
  { a: 20.5, e: 0.396 },
  { a: 21.0, e: 0.375 },
  { a: 21.5, e: 0.354 },
  { a: 22.0, e: 0.333 },
  { a: 22.5, e: 0.312 },
  { a: 23.0, e: 0.292 },
  { a: 23.5, e: 0.271 },
  { a: 24.0, e: 0.25 },
  { a: 24.5, e: 0.229 },
  { a: 25.0, e: 0.208 },
  { a: 25.5, e: 0.187 },
  { a: 26.0, e: 0.167 },
  { a: 26.5, e: 0.146 },
  { a: 27.0, e: 0.125 },
  { a: 27.5, e: 0.104 },
  { a: 28.0, e: 0.083 },
  { a: 28.5, e: 0.062 },
  { a: 29.0, e: 0.042 },
  { a: 29.5, e: 0.021 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function chunkMinutes(arr, columns = 4) {
  const safeColumns = Math.max(1, Math.trunc(columns));
  const size = Math.ceil(arr.length / safeColumns);
  return Array.from({ length: safeColumns }, (_, i) =>
    arr.slice(i * size, (i + 1) * size),
  );
}

function ensureHourRows(rows, dayType, maxHours, fallbackRate) {
  const byHour = new Map(
    (Array.isArray(rows) ? rows : []).map((r) => [Number(r.rate_value), r]),
  );
  const baseRate = Number(byHour.get(1)?.decimal_equivalent ?? fallbackRate);
  return Array.from({ length: maxHours }, (_, i) => {
    const hour = i + 1;
    const found = byHour.get(hour);
    if (found)
      return {
        ...found,
        rate_type: "hour",
        day_type: dayType,
        rate_value: hour,
        decimal_equivalent: sanitizeDecimal(found.decimal_equivalent),
      };
    return {
      rate_type: "hour",
      day_type: dayType,
      rate_value: hour,
      decimal_equivalent: Number((hour * baseRate).toFixed(3)),
    };
  });
}

function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

function sanitizeInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function getUserRole() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(json);
    return payload.role || payload.userRole || null;
  } catch {
    return null;
  }
}

// ─── Section bar — matches LeaveAssignment's inner header bars ────────────────
const SectionBar = ({ title, right, noBorderTop = false }) => (
  <Box
    sx={{
      px: 2.5,
      py: 1.1,
      bgcolor: T.accentFaint,
      borderBottom: `1px solid ${T.divider}`,
      borderTop: noBorderTop ? "none" : `1px solid ${T.divider}`,
      display: "flex",
      alignItems: "center",
      gap: 1,
    }}
  >
    <Box
      sx={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        bgcolor: T.accent,
        flexShrink: 0,
      }}
    />
    <Typography
      sx={{
        fontSize: "0.82rem",
        fontWeight: 700,
        color: T.accent,
        fontFamily: T.poppins,
        flex: 1,
      }}
    >
      {title}
    </Typography>
    {right}
  </Box>
);

// ─── Editable decimal input — uses FieldInput base ───────────────────────────
function EditableDecimalInput({ committedValue, onCommit, disabled }) {
  const [draft, setDraft] = useState(null);
  return (
    <FieldInput
      size="small"
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={draft !== null ? draft : String(committedValue ?? "")}
      onFocus={() => setDraft(String(committedValue ?? ""))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        onCommit(e.target.value);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      inputProps={{
        style: {
          fontSize: "0.72rem",
          fontWeight: 700,
          color: T.text,
          padding: "3px 8px",
          fontFamily: T.poppins,
          textAlign: "right",
        },
      }}
      sx={{
        width: "100%",
        "& .MuiOutlinedInput-root": {
          borderRadius: "6px",
          height: 26,
        },
      }}
    />
  );
}

// ─── Editable integer input — uses FieldInput base ───────────────────────────
function EditableIntInput({
  committedValue,
  onCommit,
  placeholder,
  max,
  fullWidth = false,
}) {
  const [draft, setDraft] = useState(null);
  return (
    <FieldInput
      size="small"
      type="text"
      inputMode="numeric"
      value={draft !== null ? draft : String(committedValue ?? "")}
      placeholder={placeholder}
      onFocus={() => setDraft(String(committedValue ?? ""))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        let val = sanitizeInt(e.target.value);
        if (max !== undefined) val = Math.min(val, max);
        onCommit(val);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      fullWidth={fullWidth}
      inputProps={{
        style: { fontSize: "0.9rem", fontWeight: 700, fontFamily: T.poppins },
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
          height: 38,
          bgcolor: "#fff",
        },
      }}
    />
  );
}

// ─── Column label row for tables ──────────────────────────────────────────────
const TableColHeader = ({ cols }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
      px: 1.5,
      py: 0.5,
      bgcolor: alpha(T.accent, 0.04),
      borderBottom: `0.5px solid ${T.accentBorder}`,
    }}
  >
    {cols.map((c) => (
      <Typography
        key={c}
        sx={{
          fontSize: "0.58rem",
          fontWeight: 700,
          color: alpha(T.accent, 0.5),
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontFamily: T.poppins,
        }}
      >
        {c}
      </Typography>
    ))}
  </Box>
);

// ─── Hours table ──────────────────────────────────────────────────────────────
function HoursTable({ table, setFn, label, highlightHour, isTech, patchHour }) {
  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: `0.5px solid ${T.accentBorder}`,
        overflow: "hidden",
        bgcolor: T.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        height: "fit-content",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          bgcolor: T.accentFaint,
          borderBottom: `0.5px solid ${T.accentBorder}`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 800,
            color: T.accent,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: T.poppins,
          }}
        >
          {label}
        </Typography>
      </Box>
      <TableColHeader cols={["Hrs", "Dec."]} />
      <Box>
        {table.map((row, idx) => (
          <Box
            key={row.rate_value}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              px: 1.5,
              py: 0.5,
              borderBottom:
                idx < table.length - 1
                  ? `0.5px solid rgba(0,0,0,0.05)`
                  : "none",
              alignItems: "center",
              bgcolor:
                row.rate_value === highlightHour
                  ? alpha(T.accent, 0.08)
                  : idx % 2 === 0
                    ? T.rowEven
                    : T.rowOdd,
              "&:hover": {
                bgcolor:
                  row.rate_value === highlightHour
                    ? alpha(T.accent, 0.1)
                    : T.rowHover,
              },
              transition: "background 0.1s",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 500,
                color: T.text,
                fontFamily: T.poppins,
              }}
            >
              {row.rate_value}h
            </Typography>
            {isTech ? (
              <EditableDecimalInput
                committedValue={row.decimal_equivalent}
                onCommit={(val) => patchHour(setFn, row.rate_value, val)}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: T.accent,
                  fontFamily: T.poppins,
                }}
              >
                {Number(row.decimal_equivalent).toFixed(3)}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Minute chunk table ───────────────────────────────────────────────────────
function MinChunk({ chunk, label, highlightMinute, isTech, patchMinute }) {
  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: `0.5px solid ${T.accentBorder}`,
        overflow: "hidden",
        bgcolor: T.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        height: "fit-content",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          bgcolor: T.accentFaint,
          borderBottom: `0.5px solid ${T.accentBorder}`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 800,
            color: T.accent,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: T.poppins,
          }}
        >
          Min {label}
        </Typography>
      </Box>
      <TableColHeader cols={["Min", "Dec."]} />
      <Box>
        {chunk.map((row, idx) => (
          <Box
            key={row.rate_value}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              px: 1.5,
              py: 0.5,
              borderBottom:
                idx < chunk.length - 1
                  ? `0.5px solid rgba(0,0,0,0.05)`
                  : "none",
              alignItems: "center",
              bgcolor:
                row.rate_value === highlightMinute
                  ? alpha(T.accent, 0.08)
                  : idx % 2 === 0
                    ? T.rowEven
                    : T.rowOdd,
              "&:hover": {
                bgcolor:
                  row.rate_value === highlightMinute
                    ? alpha(T.accent, 0.1)
                    : T.rowHover,
              },
              transition: "background 0.1s",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 500,
                color: T.text,
                fontFamily: T.poppins,
              }}
            >
              {row.rate_value}m
            </Typography>
            {isTech ? (
              <EditableDecimalInput
                committedValue={row.decimal_equivalent}
                onCommit={(val) => patchMinute(row.rate_value, val)}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: T.accent,
                  fontFamily: T.poppins,
                }}
              >
                {Number(row.decimal_equivalent).toFixed(3)}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── LWP table ────────────────────────────────────────────────────────────────
function LwpTable({ rows, label, highlightDay, isTech, patchLwp }) {
  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: `0.5px solid ${T.accentBorder}`,
        overflow: "hidden",
        bgcolor: T.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        height: "fit-content",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          bgcolor: T.accentFaint,
          borderBottom: `0.5px solid ${T.accentBorder}`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 800,
            color: T.accent,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: T.poppins,
          }}
        >
          {label}
        </Typography>
      </Box>
      <TableColHeader cols={["Days", "Leave Earned"]} />
      <Box>
        {rows.map((row, idx) => (
          <Box
            key={row.d}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              px: 1.5,
              py: 0.5,
              borderBottom:
                idx < rows.length - 1 ? `0.5px solid rgba(0,0,0,0.05)` : "none",
              alignItems: "center",
              bgcolor:
                row.d === highlightDay
                  ? alpha(T.accent, 0.08)
                  : idx % 2 === 0
                    ? T.rowEven
                    : T.rowOdd,
              "&:hover": {
                bgcolor:
                  row.d === highlightDay ? alpha(T.accent, 0.1) : T.rowHover,
              },
              transition: "background 0.1s",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 500,
                color: T.text,
                fontFamily: T.poppins,
              }}
            >
              {row.d}
            </Typography>
            {isTech ? (
              <EditableDecimalInput
                committedValue={row.e}
                onCommit={(val) => patchLwp(row.d, val)}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: T.accent,
                  fontFamily: T.poppins,
                }}
              >
                {row.e.toFixed(3)}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Absent table ────────────────────────────────────────────────────────────
function AbsTable({ rows, label, highlightAbs, isTech, patchAbs }) {
  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: `0.5px solid ${T.accentBorder}`,
        overflow: "hidden",
        bgcolor: T.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        height: "fit-content",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          bgcolor: T.accentFaint,
          borderBottom: `0.5px solid ${T.accentBorder}`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 800,
            color: T.accent,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: T.poppins,
          }}
        >
          {label}
        </Typography>
      </Box>
      <TableColHeader cols={["Abs w/o Pay", "Leave Earned"]} />
      <Box>
        {rows.map((row, idx) => (
          <Box
            key={row.a}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              px: 1.5,
              py: 0.5,
              borderBottom:
                idx < rows.length - 1 ? `0.5px solid rgba(0,0,0,0.05)` : "none",
              alignItems: "center",
              bgcolor:
                Math.abs(row.a - highlightAbs) < 0.001
                  ? alpha(T.accent, 0.08)
                  : idx % 2 === 0
                    ? T.rowEven
                    : T.rowOdd,
              "&:hover": {
                bgcolor:
                  Math.abs(row.a - highlightAbs) < 0.001
                    ? alpha(T.accent, 0.1)
                    : T.rowHover,
              },
              transition: "background 0.1s",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 500,
                color: T.text,
                fontFamily: T.poppins,
              }}
            >
              {row.a.toFixed(1)}
            </Typography>
            {isTech ? (
              <EditableDecimalInput
                committedValue={row.e}
                onCommit={(val) => patchAbs(row.a, val)}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: T.accent,
                  fontFamily: T.poppins,
                }}
              >
                {row.e.toFixed(3)}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Result stat box ──────────────────────────────────────────────────────────
const ResultBox = ({ label, value, sub, primary = false }) => (
  <Box
    sx={{
      p: "10px 8px",
      borderRadius: "10px",
      textAlign: "center",
      border: `1px solid ${primary ? T.accent : T.accentBorder}`,
      bgcolor: primary ? T.accent : alpha(T.accent, 0.04),
      flex: 1,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.57rem",
        fontWeight: 700,
        color: primary ? "rgba(255,255,255,0.6)" : alpha(T.accent, 0.5),
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        mb: 0.75,
        fontFamily: T.poppins,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontWeight: 900,
        color: primary ? "#fff" : T.accent,
        fontSize: primary ? "1.45rem" : "1.3rem",
        lineHeight: 1,
        fontFamily: T.poppins,
      }}
    >
      {value}
    </Typography>
    {sub && (
      <Typography
        sx={{
          fontSize: "0.62rem",
          color: primary ? "rgba(255,255,255,0.5)" : T.faint,
          mt: 0.5,
          fontFamily: T.poppins,
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

// ─── Quick Converter ──────────────────────────────────────────────────────────
function QuickConverter({
  hours,
  setHours,
  minutes,
  setMinutes,
  result,
  dayType,
}) {
  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: `0.5px solid ${T.accentBorder}`,
        overflow: "hidden",
        bgcolor: T.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SectionBar
        title="Quick Converter"
        noBorderTop
        right={
          <Chip
            label={`${dayType} mode`}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.62rem",
              fontWeight: 700,
              bgcolor: T.accentFaint,
              color: T.accent,
              border: `1px solid ${T.accentBorder}`,
              fontFamily: T.poppins,
            }}
          />
        }
      />
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <Box>
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: alpha(T.accent, 0.45),
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                mb: 0.6,
                fontFamily: T.poppins,
              }}
            >
              Hours (0+)
            </Typography>
            <EditableIntInput
              committedValue={hours}
              onCommit={setHours}
              placeholder="0"
              fullWidth
            />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: alpha(T.accent, 0.45),
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                mb: 0.6,
                fontFamily: T.poppins,
              }}
            >
              Minutes (0–59)
            </Typography>
            <EditableIntInput
              committedValue={minutes}
              onCommit={setMinutes}
              placeholder="0"
              max={59}
              fullWidth
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <ResultBox
            label="Hours dec."
            value={Number(result.hDec).toFixed(3)}
            sub={`${hours}h`}
          />
          <ResultBox
            label="Total decimal"
            value={result.total.toFixed(3)}
            sub={`${result.totalMin} min`}
            primary
          />
          <ResultBox
            label="Minutes dec."
            value={Number(result.mDec).toFixed(3)}
            sub={`${minutes}m`}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            p: "8px 12px",
            borderRadius: "8px",
            bgcolor: T.accentFaint,
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.7rem",
              color: T.muted,
              fontWeight: 600,
              fontFamily: T.poppins,
            }}
          >
            Working Hourse Equivalent:
          </Typography>
          <Typography
            sx={{
              fontSize: "0.82rem",
              fontWeight: 800,
              color: T.accent,
              fontFamily: T.poppins,
            }}
          >
            {hours}h {minutes}m = {result.total.toFixed(3)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Leave Credits Tab ────────────────────────────────────────────────────────
function LeaveCreditsTab({ isTech }) {
  const [lcDays, setLcDays] = useState(1);
  const [lcAbs, setLcAbs] = useState(0);
  const [lwpTable, setLwpTable] = useState(DEFAULT_LWP_TABLE);
  const [absTable, setAbsTable] = useState(DEFAULT_ABS_TABLE);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  // ── Load persisted rates on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/api/working-hours/leave-credits/rates`,
        );
        // data.lwp = [{ d, e }]  |  data.abs = [{ a, e }]
        if (Array.isArray(data.lwp) && data.lwp.length === 30) {
          setLwpTable(data.lwp);
        }
        if (Array.isArray(data.abs) && data.abs.length === 60) {
          setAbsTable(data.abs);
        }
      } catch {
        // silently keep defaults — same behaviour as WorkingHoursConverter
      }
    })();
  }, []);

  const patchLwp = useCallback(
    (day, val) =>
      setLwpTable((prev) =>
        prev.map((r) => (r.d === day ? { ...r, e: sanitizeDecimal(val) } : r)),
      ),
    [],
  );

  const patchAbs = useCallback(
    (abs, val) =>
      setAbsTable((prev) =>
        prev.map((r) =>
          Math.abs(r.a - abs) < 0.001 ? { ...r, e: sanitizeDecimal(val) } : r,
        ),
      ),
    [],
  );

  const lcResult = useMemo(() => {
    const daysEntry = lwpTable.find((r) => r.d === lcDays);
    const earned = daysEntry
      ? daysEntry.e
      : parseFloat((lcDays * 0.04167).toFixed(3));
    const absEntry =
      lcAbs > 0 ? absTable.find((r) => Math.abs(r.a - lcAbs) < 0.001) : null;
    const net = absEntry ? absEntry.e : earned;
    return { earned, net };
  }, [lcDays, lcAbs, lwpTable, absTable]);

  const lwpChunk1 = lwpTable.slice(0, 10);
  const lwpChunk2 = lwpTable.slice(10, 20);
  const lwpChunk3 = lwpTable.slice(20, 30);

  const absQ = Math.ceil(absTable.length / 4);
  const absC1 = absTable.slice(0, absQ);
  const absC2 = absTable.slice(absQ, absQ * 2);
  const absC3 = absTable.slice(absQ * 2, absQ * 3);
  const absC4 = absTable.slice(absQ * 3);

  const absLabel = (chunk) =>
    chunk.length
      ? `Abs ${chunk[0].a.toFixed(1)}–${chunk[chunk.length - 1].a.toFixed(1)}`
      : "";

  // ── Save rates to backend ──────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveErr("");
      setSaveMsg("");
      const { data } = await axios.put(
        `${API_BASE_URL}/api/working-hours/leave-credits/rates`,
        {
          lwp: lwpTable,
          abs: absTable,
        },
      );
      // Hydrate from server response (same pattern as WorkingHoursConverter)
      if (Array.isArray(data.lwp) && data.lwp.length === 30)
        setLwpTable(data.lwp);
      if (Array.isArray(data.abs) && data.abs.length === 60)
        setAbsTable(data.abs);
      setSaveMsg("Rates saved successfully.");
    } catch (e) {
      setSaveErr(
        e.response?.data?.message || e.message || "Failed to save rates.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── JSX is identical to original — no visual changes ──────────────────────
  return (
    <Box>
      <SectionBar
        title="Leave Credits Earned During Leave of Absent"
        noBorderTop
      />

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* Row 1: Quick Lookup + 3 LWP tables */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 1.25,
            alignItems: "start",
          }}
        >
          {/* Quick Lookup */}
          <Box
            sx={{
              borderRadius: "10px",
              border: `0.5px solid ${T.accentBorder}`,
              overflow: "hidden",
              bgcolor: T.surface,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SectionBar
              title="Quick Lookup"
              noBorderTop
              right={
                <Typography
                  sx={{
                    fontSize: "0.6rem",
                    color: T.faint,
                    fontWeight: 700,
                    fontFamily: T.poppins,
                  }}
                >
                  LOA
                </Typography>
              }
            />
            <Box
              sx={{
                p: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: alpha(T.accent, 0.45),
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      mb: 0.5,
                      fontFamily: T.poppins,
                    }}
                  >
                    LWP | Days
                  </Typography>
                  <EditableIntInput
                    committedValue={lcDays}
                    onCommit={(v) =>
                      setLcDays(Math.min(30, Math.max(1, v || 1)))
                    }
                    placeholder="1"
                    max={30}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: alpha(T.accent, 0.45),
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      mb: 0.5,
                      fontFamily: T.poppins,
                    }}
                  >
                    Abs w/o Pay
                  </Typography>
                  <FieldInput
                    size="small"
                    type="number"
                    fullWidth
                    inputProps={{
                      min: 0,
                      max: 29.5,
                      step: 0.5,
                      style: {
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        fontFamily: T.poppins,
                        padding: "6px 8px",
                      },
                    }}
                    value={lcAbs}
                    onChange={(e) =>
                      setLcAbs(
                        Math.min(
                          29.5,
                          Math.max(0, parseFloat(e.target.value) || 0),
                        ),
                      )
                    }
                    placeholder="0"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        height: 38,
                        bgcolor: "#fff",
                      },
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    p: "10px 8px",
                    borderRadius: "8px",
                    textAlign: "center",
                    bgcolor: T.accent,
                    border: `1px solid ${T.accent}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.6)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      mb: 0.5,
                      fontFamily: T.poppins,
                    }}
                  >
                    Earned
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: "#fff",
                      fontSize: "1.25rem",
                      lineHeight: 1,
                      fontFamily: T.poppins,
                    }}
                  >
                    {lcResult.earned.toFixed(3)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.60rem",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                      mt: 0.4,
                      fontFamily: T.poppins,
                    }}
                  >
                    {lcDays} Day (s)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    p: "10px 8px",
                    borderRadius: "8px",
                    textAlign: "center",
                    bgcolor: T.accent,
                    border: `1px solid ${T.accent}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.6)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      mb: 0.5,
                      fontFamily: T.poppins,
                    }}
                  >
                    After Abs
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: "#fff",
                      fontSize: "1.25rem",
                      lineHeight: 1,
                      fontFamily: T.poppins,
                    }}
                  >
                    {lcResult.net.toFixed(3)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.60rem",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                      mt: 0.4,
                      fontFamily: T.poppins,
                    }}
                  >
                    {lcAbs > 0 ? `${lcAbs} Day (s)` : "None"}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                  p: "7px 10px",
                  borderRadius: "8px",
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    color: T.muted,
                    fontWeight: 600,
                    fontFamily: T.poppins,
                    whiteSpace: "nowrap",
                  }}
                >
                  LWP:
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: T.accent,
                    fontFamily: T.poppins,
                  }}
                >
                  {lcDays} Day(s) → {lcResult.earned.toFixed(3)}
                </Typography>
                <Chip
                  label="LOA"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    bgcolor: T.accent,
                    color: "#fff",
                    fontFamily: T.poppins,
                  }}
                />
              </Box>

              <Box
                sx={{
                  p: "7px 10px",
                  borderRadius: "8px",
                  bgcolor: alpha(T.accent, 0.03),
                  border: `0.5px solid ${T.accentBorder}`,
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    color: T.muted,
                    fontFamily: T.poppins,
                    lineHeight: 1.6,
                  }}
                >
                  Earned at{" "}
                  <strong style={{ color: T.accent }}>1.250/mo</strong>.<br />
                  Absents w/o pay reduce credits.
                </Typography>
              </Box>
            </Box>
          </Box>

          <LwpTable
            rows={lwpChunk1}
            label="LWP Days 1–10"
            highlightDay={lcDays}
            isTech={isTech}
            patchLwp={patchLwp}
          />
          <LwpTable
            rows={lwpChunk2}
            label="LWP Days 11–20"
            highlightDay={lcDays}
            isTech={isTech}
            patchLwp={patchLwp}
          />
          <LwpTable
            rows={lwpChunk3}
            label="LWP Days 21–30"
            highlightDay={lcDays}
            isTech={isTech}
            patchLwp={patchLwp}
          />
        </Box>

        {/* Row 2: 4 Abs tables */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1.25,
            alignItems: "start",
          }}
        >
          <AbsTable
            rows={absC1}
            label={absLabel(absC1)}
            highlightAbs={lcAbs}
            isTech={isTech}
            patchAbs={patchAbs}
          />
          <AbsTable
            rows={absC2}
            label={absLabel(absC2)}
            highlightAbs={lcAbs}
            isTech={isTech}
            patchAbs={patchAbs}
          />
          <AbsTable
            rows={absC3}
            label={absLabel(absC3)}
            highlightAbs={lcAbs}
            isTech={isTech}
            patchAbs={patchAbs}
          />
          <AbsTable
            rows={absC4}
            label={absLabel(absC4)}
            highlightAbs={lcAbs}
            isTech={isTech}
            patchAbs={patchAbs}
          />
        </Box>
      </Box>

      {/* Save row — technical only */}
      {isTech && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2.5,
            py: 1.5,
            borderTop: `0.5px solid ${T.divider}`,
            bgcolor: "#f9f9f9",
          }}
        >
          <AccentButton
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            startIcon={
              isSaving ? (
                <CircularProgress size={13} sx={{ color: "#fff" }} />
              ) : (
                <SaveIcon sx={{ fontSize: "14px !important" }} />
              )
            }
            sx={{
              bgcolor: T.accent,
              color: "#fff",
              fontSize: "0.78rem",
              fontFamily: T.poppins,
              "&:hover": { bgcolor: T.accentDark },
            }}
          >
            {isSaving ? "Saving…" : "Save Rates"}
          </AccentButton>
          {saveMsg && (
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#166534",
                fontFamily: T.poppins,
              }}
            >
              {saveMsg}
            </Typography>
          )}
          {saveErr && (
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#b91c1c",
                fontFamily: T.poppins,
              }}
            >
              {saveErr}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkingHoursConverter({ userRole: propRole }) {
  const detectedRole = useMemo(() => getUserRole(), []);
  const effectiveRole = propRole || detectedRole || "staff";
  const isTech = effectiveRole === "technical";

  const [activeTab, setActiveTab] = useState("wh");
  const [dayType, setDayType] = useState("8hr");
  const [hours8Table, setHours8Table] = useState(DEFAULT_HOURS_8);
  const [hours6Table, setHours6Table] = useState(DEFAULT_HOURS_6);
  const [minutesTable, setMinutesTable] = useState(DEFAULT_MINUTES);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/api/working-hours/rates`,
        );
        if (Array.isArray(data.hours8) && data.hours8.length > 0)
          setHours8Table(ensureHourRows(data.hours8, "8hr", 8, 0.125));
        if (Array.isArray(data.hours6) && data.hours6.length > 0)
          setHours6Table(ensureHourRows(data.hours6, "6hr", 8, 0.167));
        if (Array.isArray(data.minutes) && data.minutes.length === 60)
          setMinutesTable(data.minutes);
      } catch {
        setHours8Table(DEFAULT_HOURS_8);
        setHours6Table(DEFAULT_HOURS_6);
        setMinutesTable(DEFAULT_MINUTES);
      }
    })();
  }, []);

  const activeHoursTable = dayType === "6hr" ? hours6Table : hours8Table;

  const patchHour = useCallback(
    (setFn, rateValue, val) =>
      setFn((prev) =>
        prev.map((r) =>
          r.rate_value === rateValue
            ? { ...r, decimal_equivalent: sanitizeDecimal(val) }
            : r,
        ),
      ),
    [],
  );

  const patchMinute = useCallback(
    (rateValue, val) =>
      setMinutesTable((prev) =>
        prev.map((r) =>
          r.rate_value === rateValue
            ? { ...r, decimal_equivalent: sanitizeDecimal(val) }
            : r,
        ),
      ),
    [],
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveErr("");
      setSaveMsg("");
      const entries = [
        ...hours8Table.map((r) => ({
          rate_type: "hour",
          day_type: "8hr",
          rate_value: r.rate_value,
          decimal_equivalent: sanitizeDecimal(r.decimal_equivalent),
        })),
        ...hours6Table.map((r) => ({
          rate_type: "hour",
          day_type: "6hr",
          rate_value: r.rate_value,
          decimal_equivalent: sanitizeDecimal(r.decimal_equivalent),
        })),
        ...minutesTable.map((r) => ({
          rate_type: "minute",
          day_type: "minute",
          rate_value: r.rate_value,
          decimal_equivalent: sanitizeDecimal(r.decimal_equivalent),
        })),
      ];
      const { data } = await axios.put(
        `${API_BASE_URL}/api/working-hours/rates`,
        { entries },
      );
      if (Array.isArray(data.hours8)) setHours8Table(data.hours8);
      if (Array.isArray(data.hours6)) setHours6Table(data.hours6);
      if (Array.isArray(data.minutes)) setMinutesTable(data.minutes);
      setSaveMsg("Rates saved successfully.");
    } catch (e) {
      setSaveErr(
        e.response?.data?.message || e.message || "Failed to save rates.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const result = useMemo(() => {
    const hEntry = activeHoursTable.find((h) => h.rate_value === hours);
    const mEntry = minutesTable.find((m) => m.rate_value === minutes);
    const defaultHourlyRate = dayType === "6hr" ? 0.167 : 0.125;
    const hourlyRate = Number(
      activeHoursTable.find((h) => h.rate_value === 1)?.decimal_equivalent ??
        defaultHourlyRate,
    );
    const hDec =
      hours === 0
        ? 0
        : Number((hEntry?.decimal_equivalent ?? hours * hourlyRate).toFixed(3));
    const mDec = minutes === 0 ? 0 : (mEntry?.decimal_equivalent ?? 0);
    return {
      hDec,
      mDec,
      total: Number((hDec + mDec).toFixed(3)),
      totalMin: hours * 60 + minutes,
    };
  }, [hours, minutes, dayType, activeHoursTable, minutesTable]);

  const minuteChunks = chunkMinutes(minutesTable, 4);
  const chunkLabels = minuteChunks.map((chunk) => {
    const start = chunk[0]?.rate_value;
    const end = chunk[chunk.length - 1]?.rate_value;
    return start && end ? `${start}–${end}` : "";
  });

  // ── Toggle button shared sx — matches LeaveAssignment exactly ──────────────
  const toggleSx = {
    "& .MuiToggleButton-root": {
      px: 1.5,
      py: 0.3,
      border: `1px solid ${T.accentBorder}`,
      fontSize: "0.72rem",
      fontWeight: 700,
      color: T.muted,
      fontFamily: T.poppins,
      "&.Mui-selected": {
        bgcolor: T.accent,
        color: "#fff",
        borderColor: T.accent,
      },
    },
  };

  return (
    // ── Full-width wrapper — identical pattern to LeaveAssignment ─────────────
    <Fade in timeout={400}>
      <Box
        sx={{
          fontFamily: T.poppins,
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "63%",
          transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        {/* ── Page Header — gradient matches LeaveAssignment ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 4,
              py: 3,
              background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative radials */}
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${alpha(T.accent, 0.1)} 0%, transparent 70%)`,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -30,
                left: "30%",
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${alpha(T.accent, 0.07)} 0%, transparent 70%)`,
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                position: "relative",
                zIndex: 1,
              }}
            >
              <ClockIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.3,
                    fontFamily: T.poppins,
                  }}
                >
                  Conversion Tools
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: T.accentMid,
                    fontWeight: 700,
                    opacity: 0.9,
                    fontFamily: T.poppins,
                  }}
                >
                  Working Hours&nbsp;•&nbsp;Leave Credits Earned During Leave of
                  Absent&nbsp;•&nbsp;Days | Hours | Minutes
                </Typography>
              </Box>
            </Box>

            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Box
                sx={{
                  px: 2.5,
                  py: 0.75,
                  borderRadius: 6,
                  bgcolor: alpha(T.accent, 0.1),
                  border: `1px solid ${alpha(T.accent, 0.2)}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.8rem",
                    color: T.accent,
                    fontWeight: 700,
                    fontFamily: T.poppins,
                  }}
                >
                  {activeTab === "wh"
                    ? "Working Hours"
                    : "Leave Credits Earned During Leave of Absent"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Main Card with Tabs ── */}
        <SectionCard>
          {/* Tab Bar — matches LeaveAssignment's inner tab pattern */}
          <Box
            sx={{
              display: "flex",
              borderBottom: `1px solid ${T.accentBorder}`,
              bgcolor: T.accentFaint,
            }}
          >
            {[
              { key: "wh", label: "Working Hours Conversion" },
              { key: "lc", label: "Leave Credits (LOA)" },
            ].map((tab) => (
              <Box
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                sx={{
                  flex: 1,
                  px: 2,
                  py: 1.4,
                  cursor: "pointer",
                  textAlign: "center",
                  borderBottom: `2.5px solid ${activeTab === tab.key ? T.accent : "transparent"}`,
                  bgcolor:
                    activeTab === tab.key
                      ? alpha(T.accent, 0.05)
                      : "transparent",
                  transition: "all 0.15s",
                  "&:hover":
                    activeTab !== tab.key ? { bgcolor: T.accentHover } : {},
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: activeTab === tab.key ? T.accent : T.accentMid,
                    fontFamily: T.poppins,
                    letterSpacing: "0.01em",
                  }}
                >
                  {tab.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* ── Tab content ── */}
          <Box sx={{ width: "100%", minWidth: 0 }}>
            {/* ── Working Hours Tab ── */}
            {activeTab === "wh" && (
              <>
                <SectionBar
                  title="Conversion Tables"
                  noBorderTop
                  right={
                    <ToggleButtonGroup
                      value={dayType}
                      exclusive
                      onChange={(_, v) => v && setDayType(v)}
                      size="small"
                      sx={toggleSx}
                    >
                      <ToggleButton value="8hr">8hr</ToggleButton>
                      <ToggleButton value="6hr">6hr</ToggleButton>
                    </ToggleButtonGroup>
                  }
                />

                <Box
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  {/* Row 1: hour tables + quick converter */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(130px,160px) minmax(130px,160px) 1fr",
                      gap: 1.5,
                      alignItems: "start",
                    }}
                  >
                    <HoursTable
                      table={hours8Table}
                      setFn={setHours8Table}
                      label="8-hr Day"
                      highlightHour={hours}
                      isTech={isTech}
                      patchHour={patchHour}
                    />
                    <HoursTable
                      table={hours6Table}
                      setFn={setHours6Table}
                      label="6-hr Day"
                      highlightHour={hours}
                      isTech={isTech}
                      patchHour={patchHour}
                    />
                    <QuickConverter
                      hours={hours}
                      setHours={setHours}
                      minutes={minutes}
                      setMinutes={setMinutes}
                      result={result}
                      dayType={dayType}
                    />
                  </Box>

                  {/* Row 2: minute chunks */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 1.5,
                    }}
                  >
                    {minuteChunks.map((chunk, i) => (
                      <MinChunk
                        key={i}
                        chunk={chunk}
                        label={chunkLabels[i]}
                        highlightMinute={minutes}
                        isTech={isTech}
                        patchMinute={patchMinute}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Save row — technical only */}
                {isTech && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2.5,
                      py: 1.5,
                      borderTop: `0.5px solid ${T.divider}`,
                      bgcolor: "#f9f9f9",
                    }}
                  >
                    <AccentButton
                      variant="contained"
                      onClick={handleSave}
                      disabled={isSaving}
                      startIcon={
                        isSaving ? (
                          <CircularProgress size={13} sx={{ color: "#fff" }} />
                        ) : (
                          <SaveIcon sx={{ fontSize: "14px !important" }} />
                        )
                      }
                      sx={{
                        bgcolor: T.accent,
                        color: "#fff",
                        fontSize: "0.78rem",
                        fontFamily: T.poppins,
                        boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                        "&:hover": { bgcolor: T.accentDark },
                      }}
                    >
                      {isSaving ? "Saving…" : "Save Rates"}
                    </AccentButton>
                    {saveMsg && (
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#166534",
                          fontFamily: T.poppins,
                        }}
                      >
                        {saveMsg}
                      </Typography>
                    )}
                    {saveErr && (
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#b91c1c",
                          fontFamily: T.poppins,
                        }}
                      >
                        {saveErr}
                      </Typography>
                    )}
                  </Box>
                )}
              </>
            )}

            {/* ── Leave Credits Tab ── */}
            {activeTab === "lc" && <LeaveCreditsTab isTech={isTech} />}
          </Box>
        </SectionCard>
      </Box>
    </Fade>
  );
}
