import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../apiConfig";

const COMPONENT_STYLES = `
.cv-page { padding: 16px; background: transparent; }

.cv-card {
  background: #fff;
  border-radius: 12px;
  border: 0.5px solid rgba(0,0,0,0.09);
  overflow: hidden;
}

.cv-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: rgba(109,35,35,0.06);
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.cv-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #6d2323;
  flex-shrink: 0;
}

.cv-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6d2323;
  letter-spacing: 0.02em;
}

.cv-toggle-group {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.cv-toggle-btn {
  padding: 3px 10px;
  border: 1px solid rgba(109,35,35,0.28);
  border-radius: 6px;
  background: transparent;
  font-size: 0.7rem;
  font-weight: 700;
  color: #6d2323;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.cv-toggle-btn.active {
  background: #6d2323;
  color: #fff;
  border-color: #6d2323;
}

/* ── Body ── */
.cv-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Row 1: 8hr | 6hr | quick converter (stretches) */
.cv-row1 {
  display: grid;
  grid-template-columns: minmax(110px, 140px) minmax(110px, 140px) 1fr;
  gap: 10px;
  align-items: start;
}

/* Row 2: minutes fill full width */
.cv-row2 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

/* ── Table chrome ── */
.cv-tbl {
  border-radius: 8px;
  border: 0.5px solid rgba(109,35,35,0.14);
  overflow: hidden;
}

.cv-tbl-head {
  padding: 4px 10px;
  background: rgba(109,35,35,0.08);
  border-bottom: 0.5px solid rgba(109,35,35,0.1);
  font-size: 0.6rem;
  font-weight: 800;
  color: #6d2323;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.cv-tbl-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px 10px;
  background: rgba(109,35,35,0.04);
  border-bottom: 0.5px solid rgba(109,35,35,0.08);
}

.cv-tbl-cols span {
  font-size: 0.56rem;
  font-weight: 700;
  color: rgba(109,35,35,0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cv-tbl-body {
  max-height: none;
  overflow-y: visible;
}

.cv-tbl-body::-webkit-scrollbar { width: 3px; }
.cv-tbl-body::-webkit-scrollbar-thumb {
  background: rgba(109,35,35,0.18);
  border-radius: 2px;
}

.cv-tbl-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px 10px;
  border-bottom: 0.5px solid rgba(0,0,0,0.05);
  align-items: center;
  transition: background 0.1s;
}

.cv-tbl-row:last-child { border-bottom: none; }
.cv-tbl-row:hover { background: rgba(109,35,35,0.03); }
.cv-tbl-row.hl { background: rgba(109,35,35,0.08); }

.cv-cell-lbl {
  font-size: 0.67rem;
  font-weight: 500;
  color: #1a1a1a;
}

.cv-cell-ro {
  font-size: 0.67rem;
  font-weight: 700;
  color: #6d2323;
}

.cv-cell-input {
  width: 100%;
  height: 22px;
  border: 1px solid rgba(109,35,35,0.18);
  border-radius: 4px;
  padding: 0 5px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #1a1a1a;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  -moz-appearance: textfield;
}

.cv-cell-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.cv-cell-input:focus { border-color: #6d2323; }

/* ── Quick Converter ── */
.cv-qc {
  border-radius: 8px;
  border: 0.5px solid rgba(109,35,35,0.14);
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.cv-qc-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(109,35,35,0.06);
  border-bottom: 0.5px solid rgba(109,35,35,0.1);
}

.cv-qc-mode {
  margin-left: auto;
  font-size: 0.58rem;
  color: rgba(109,35,35,0.45);
  font-weight: 700;
}

.cv-qc-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cv-qc-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cv-field-lbl {
  display: block;
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(109,35,35,0.55);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 4px;
}

.cv-num-input {
  width: 100%;
  height: 38px;
  border: 1px solid rgba(109,35,35,0.2);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a1a1a;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  -moz-appearance: textfield;
}

.cv-num-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.cv-num-input:focus { border-color: #6d2323; border-width: 1.5px; }

.cv-results {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.cv-res-box {
  padding: 12px 8px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(109,35,35,0.14);
  background: rgba(109,35,35,0.04);
}

.cv-res-box.primary {
  background: #6d2323;
  border-color: #6d2323;
}

.cv-res-lbl {
  font-size: 0.55rem;
  font-weight: 700;
  color: rgba(109,35,35,0.5);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 5px;
}

.cv-res-box.primary .cv-res-lbl { color: rgba(255,255,255,0.6); }

.cv-res-val {
  font-size: 1.45rem;
  font-weight: 900;
  color: #6d2323;
  line-height: 1;
}

.cv-res-box.primary .cv-res-val { color: #fff; font-size: 1.65rem; }

.cv-res-sub {
  font-size: 0.6rem;
  color: #a0a0a0;
  margin-top: 4px;
}

.cv-res-box.primary .cv-res-sub { color: rgba(255,255,255,0.5); }

.cv-equiv {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(109,35,35,0.04);
  border: 1px solid rgba(109,35,35,0.1);
}

.cv-equiv-lbl {
  font-size: 0.68rem;
  color: #6b6b6b;
  font-weight: 600;
  white-space: nowrap;
}

.cv-equiv-val {
  font-size: 0.8rem;
  font-weight: 800;
  color: #6d2323;
}

.cv-badge {
  display: inline-block;
  margin-left: 5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #6d2323;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  vertical-align: middle;
}

/* Save row */
.cv-save-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 12px;
  border-top: 0.5px solid rgba(109,35,35,0.1);
}

.cv-save-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 22px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  background: #6d2323;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}

.cv-save-btn:hover { opacity: 0.85; transform: translateY(-1px); }
.cv-save-btn:active { transform: translateY(0); }
.cv-save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.cv-status { font-size: 0.7rem; font-weight: 600; }
.cv-status.ok  { color: #166534; }
.cv-status.err { color: #b91c1c; }

/* Responsive */
@media (max-width: 920px) {
  .cv-row1 {
    grid-template-columns: 1fr 1fr;
  }
  .cv-qc { grid-column: 1 / -1; }
  .cv-row2 { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 560px) {
  .cv-row1 { grid-template-columns: 1fr; }
  .cv-row2 { grid-template-columns: 1fr; }
  .cv-results { grid-template-columns: 1fr; }
}
`;

const DEFAULT_HOURS_8 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour", day_type: "8hr", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
}));

const DEFAULT_HOURS_6 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour", day_type: "6hr", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
}));

const DEFAULT_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  rate_type: "minute", day_type: "minute", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
}));

function chunkMinutes(arr, columns = 4) {
  const safeColumns = Math.max(1, Math.trunc(columns));
  const size = Math.ceil(arr.length / safeColumns);
  return Array.from({ length: safeColumns }, (_, i) => arr.slice(i * size, (i + 1) * size));
}

function ensureHourRows(rows, dayType, maxHours, fallbackRate) {
  const byHour = new Map((Array.isArray(rows) ? rows : []).map((r) => [Number(r.rate_value), r]));
  const baseRate = Number(byHour.get(1)?.decimal_equivalent ?? fallbackRate);
  return Array.from({ length: maxHours }, (_, i) => {
    const hour = i + 1;
    const found = byHour.get(hour);
    if (found) {
      return {
        ...found,
        rate_type: "hour",
        day_type: dayType,
        rate_value: hour,
        decimal_equivalent: sanitizeDecimal(found.decimal_equivalent),
      };
    }
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
      atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    const payload = JSON.parse(json);
    return payload.role || payload.userRole || null;
  } catch { return null; }
}

export default function WorkingHoursConverter({ userRole: propRole }) {
  const detectedRole = useMemo(() => getUserRole(), []);
  const effectiveRole = propRole || detectedRole || "staff";
  const isTech = effectiveRole === "technical";

  const [dayType, setDayType] = useState("8hr");
  const [hours8Table, setHours8Table] = useState(DEFAULT_HOURS_8);
  const [hours6Table, setHours6Table] = useState(DEFAULT_HOURS_6);
  const [minutesTable, setMinutesTable] = useState(DEFAULT_MINUTES);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [hoursDraft, setHoursDraft] = useState(null);
  const [minutesDraft, setMinutesDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [draftInputs, setDraftInputs] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/working-hours/rates`);
        if (Array.isArray(data.hours8) && data.hours8.length > 0) {
          setHours8Table(ensureHourRows(data.hours8, "8hr", 8, 0.125));
        }
        if (Array.isArray(data.hours6) && data.hours6.length > 0) {
          setHours6Table(ensureHourRows(data.hours6, "6hr", 8, 0.167));
        }
        if (Array.isArray(data.minutes) && data.minutes.length === 60) setMinutesTable(data.minutes);
      } catch {
        setHours8Table(DEFAULT_HOURS_8);
        setHours6Table(DEFAULT_HOURS_6);
        setMinutesTable(DEFAULT_MINUTES);
      }
    })();
  }, []);

  const activeHoursTable = dayType === "6hr" ? hours6Table : hours8Table;

  const patchHour = (setFn, rateValue, val) =>
    setFn((prev) => prev.map((r) => r.rate_value === rateValue ? { ...r, decimal_equivalent: sanitizeDecimal(val) } : r));

  const patchMinute = (rateValue, val) =>
    setMinutesTable((prev) => prev.map((r) => r.rate_value === rateValue ? { ...r, decimal_equivalent: sanitizeDecimal(val) } : r));

  const setDraft = (key, value) => {
    setDraftInputs((prev) => ({ ...prev, [key]: value }));
  };

  const clearDraft = (key) => {
    setDraftInputs((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleToggle = (t) => {
    setDayType(t);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true); setSaveErr(""); setSaveMsg("");
      const entries = [
        ...hours8Table.map((r) => ({ rate_type: "hour", day_type: "8hr", rate_value: r.rate_value, decimal_equivalent: sanitizeDecimal(r.decimal_equivalent) })),
        ...hours6Table.map((r) => ({ rate_type: "hour", day_type: "6hr", rate_value: r.rate_value, decimal_equivalent: sanitizeDecimal(r.decimal_equivalent) })),
        ...minutesTable.map((r) => ({ rate_type: "minute", day_type: "minute", rate_value: r.rate_value, decimal_equivalent: sanitizeDecimal(r.decimal_equivalent) })),
      ];
      const { data } = await axios.put(`${API_BASE_URL}/api/working-hours/rates`, { entries });
      if (Array.isArray(data.hours8)) setHours8Table(data.hours8);
      if (Array.isArray(data.hours6)) setHours6Table(data.hours6);
      if (Array.isArray(data.minutes)) setMinutesTable(data.minutes);
      setSaveMsg("Rates saved successfully.");
    } catch (e) {
      setSaveErr(e.response?.data?.message || e.message || "Failed to save rates.");
    } finally {
      setIsSaving(false);
    }
  };

  const result = useMemo(() => {
    const hEntry = activeHoursTable.find((h) => h.rate_value === hours);
    const mEntry = minutesTable.find((m) => m.rate_value === minutes);
    const defaultHourlyRate = dayType === "6hr" ? 0.167 : 0.125;
    const hourlyRate = Number(activeHoursTable.find((h) => h.rate_value === 1)?.decimal_equivalent ?? defaultHourlyRate);
    const hDec = hours === 0 ? 0 : Number((hEntry?.decimal_equivalent ?? (hours * hourlyRate)).toFixed(3));
    const mDec = minutes === 0 ? 0 : (mEntry?.decimal_equivalent ?? 0);
    return { hDec, mDec, total: Number((hDec + mDec).toFixed(3)), totalMin: hours * 60 + minutes };
  }, [hours, minutes, dayType, activeHoursTable, minutesTable]);

  const minuteChunks = chunkMinutes(minutesTable, 4);
  const chunkLabels = minuteChunks.map((chunk) => {
    const start = chunk[0]?.rate_value;
    const end = chunk[chunk.length - 1]?.rate_value;
    return start && end ? `${start}–${end}` : "";
  });

  const HoursTable = ({ table, setFn, label }) => (
    <div className="cv-tbl">
      <div className="cv-tbl-head">{label}</div>
      <div className="cv-tbl-cols"><span>Hrs</span><span>Dec.</span></div>
      <div className="cv-tbl-body">
        {table.map((row) => (
          <div key={row.rate_value} className={`cv-tbl-row${row.rate_value === hours ? " hl" : ""}`}>
            <span className="cv-cell-lbl">{row.rate_value}h</span>
            {isTech ? (() => {
              const draftKey = `hour-${label}-${row.rate_value}`;
              const draftValue = draftInputs[draftKey];
              const inputValue = draftValue ?? String(row.decimal_equivalent ?? "");
              return (
                <input
                  className="cv-cell-input"
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(e) => setDraft(draftKey, e.target.value)}
                  onBlur={(e) => {
                    patchHour(setFn, row.rate_value, e.target.value);
                    clearDraft(draftKey);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              );
            })() : <span className="cv-cell-ro">{Number(row.decimal_equivalent).toFixed(3)}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  const MinChunk = ({ chunk, label }) => (
    <div className="cv-tbl">
      <div className="cv-tbl-head">Min {label}</div>
      <div className="cv-tbl-cols"><span>Min</span><span>Dec.</span></div>
      <div className="cv-tbl-body">
        {chunk.map((row) => (
          <div key={row.rate_value} className={`cv-tbl-row${row.rate_value === minutes ? " hl" : ""}`}>
            <span className="cv-cell-lbl">{row.rate_value}m</span>
            {isTech ? (() => {
              const draftKey = `minute-${row.rate_value}`;
              const draftValue = draftInputs[draftKey];
              const inputValue = draftValue ?? String(row.decimal_equivalent ?? "");
              return (
                <input
                  className="cv-cell-input"
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(e) => setDraft(draftKey, e.target.value)}
                  onBlur={(e) => {
                    patchMinute(row.rate_value, e.target.value);
                    clearDraft(draftKey);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              );
            })() : <span className="cv-cell-ro">{Number(row.decimal_equivalent).toFixed(3)}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="cv-page">
      <style>{COMPONENT_STYLES}</style>
      <div className="cv-card">

        <div className="cv-header">
          <div className="cv-dot" />
          <span className="cv-title">Working Hours / Minutes — Decimal Conversion</span>
          <div className="cv-toggle-group">
            <button type="button" className={`cv-toggle-btn${dayType === "8hr" ? " active" : ""}`} onClick={() => handleToggle("8hr")}>8hr</button>
            <button type="button" className={`cv-toggle-btn${dayType === "6hr" ? " active" : ""}`} onClick={() => handleToggle("6hr")}>6hr</button>
          </div>
        </div>

        <div className="cv-body">

          {/* Row 1: 8hr | 6hr | Quick Converter stretches */}
          <div className="cv-row1">
            <HoursTable table={hours8Table} setFn={setHours8Table} label="8-hr Day" />
            <HoursTable table={hours6Table} setFn={setHours6Table} label="6-hr Day" />

            <div className="cv-qc">
              <div className="cv-qc-header">
                <div className="cv-dot" />
                <span className="cv-title" style={{ fontSize: "0.72rem" }}>Quick Converter</span>
                <span className="cv-qc-mode">{dayType} mode</span>
              </div>
              <div className="cv-qc-body">
                <div className="cv-qc-inputs">
                  <div>
                    <label className="cv-field-lbl" htmlFor="cv-h">Hours (0+)</label>
                    <input
                      id="cv-h"
                      className="cv-num-input"
                      type="text"
                      inputMode="numeric"
                      value={hoursDraft ?? String(hours)}
                      onChange={(e) => setHoursDraft(e.target.value)}
                      onBlur={(e) => {
                        setHours(sanitizeInt(e.target.value));
                        setHoursDraft(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="cv-field-lbl" htmlFor="cv-m">Minutes (0–59)</label>
                    <input
                      id="cv-m"
                      className="cv-num-input"
                      type="text"
                      inputMode="numeric"
                      value={minutesDraft ?? String(minutes)}
                      onChange={(e) => setMinutesDraft(e.target.value)}
                      onBlur={(e) => {
                        setMinutes(Math.min(sanitizeInt(e.target.value), 59));
                        setMinutesDraft(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="cv-results">
                  <div className="cv-res-box">
                    <div className="cv-res-lbl">Hours dec.</div>
                    <div className="cv-res-val">{Number(result.hDec).toFixed(3)}</div>
                    <div className="cv-res-sub">{hours}h</div>
                  </div>
                  <div className="cv-res-box primary">
                    <div className="cv-res-lbl">Total decimal</div>
                    <div className="cv-res-val">{result.total.toFixed(3)}</div>
                    <div className="cv-res-sub">{result.totalMin} min</div>
                  </div>
                  <div className="cv-res-box">
                    <div className="cv-res-lbl">Minutes dec.</div>
                    <div className="cv-res-val">{Number(result.mDec).toFixed(3)}</div>
                    <div className="cv-res-sub">{minutes}m</div>
                  </div>
                </div>

                <div className="cv-equiv">
                  <span className="cv-equiv-lbl">Equivalent:</span>
                  <span className="cv-equiv-val">
                    {hours}h {minutes}m = {result.total.toFixed(3)}
                    <span className="cv-badge">{dayType}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: minutes spanning full width */}
          <div className="cv-row2">
            {minuteChunks.map((chunk, i) => (
              <MinChunk key={i} chunk={chunk} label={chunkLabels[i]} />
            ))}
          </div>

        </div>

        {isTech && (
          <div className="cv-save-row">
            <button type="button" className="cv-save-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Rates"}
            </button>
            {(saveMsg || saveErr) && (
              <span className={`cv-status ${saveErr ? "err" : "ok"}`}>{saveErr || saveMsg}</span>
            )}
          </div>
        )}

      </div>
    </div>
  );
} 