import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Paper,
  List,
  ListItemButton,
  IconButton,
  InputAdornment,
  CircularProgress,
  Avatar,
  Chip,
  alpha,
} from '@mui/material';
import {
  SearchOutlined,
  Close,
  Person,
  Male as MaleIcon,
  Female as FemaleIcon,
  KeyboardReturn,
} from '@mui/icons-material';
import { DeptBadge, EmpCatBadge } from '../LEAVE/EARNINGS/RecordsList';
import { FILTER_T } from './attendanceFilterLayout';

const T = FILTER_T;

export const getEmployeeIdentifier = (emp) => {
  if (!emp || typeof emp !== 'object') return '';
  const raw =
    emp.personID ?? emp.PersonID ?? emp.employeeNum
    ?? emp.employeeNumber ?? emp.agencyEmployeeNum ?? '';
  return String(raw).trim();
};

export const toProfileEmployee = (emp) => {
  if (!emp) return null;
  const num = getEmployeeIdentifier(emp);
  return { ...emp, employeeNumber: num || emp.employeeNumber };
};

const formatFullName = (fullName) => {
  if (!fullName) return '';
  const cleaned = String(fullName).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);
  let suffix = '';
  if (suffixes.has(parts[parts.length - 1]?.toUpperCase())) suffix = parts.pop();
  const last = parts[0] || '';
  const rest = parts.slice(1).join(' ');
  const base = last ? `${last.toUpperCase()}${rest ? `, ${rest}` : ''}` : rest;
  return suffix ? `${base} ${suffix}` : base;
};

export const buildDisplayName = (e) => {
  const last = (e?.lastName || '').trim();
  const first = (e?.firstName || '').trim();
  const mid = (e?.middleName || '').trim();
  if (!last && !first) {
    const raw = String(e?.name || e?.fullName || '').trim();
    if (!raw) {
      const num = getEmployeeIdentifier(e);
      return num ? `#${num}` : '';
    }
    if (raw.includes(',')) return raw;
    const fromFull = formatFullName(raw);
    if (fromFull) return fromFull;
    return e?.employeeNumber ? `#${e.employeeNumber}` : raw;
  }
  return last
    ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(' ')}`
    : [first, mid].filter(Boolean).join(' ');
};

const getEmployeeInitials = (e) =>
  `${e?.lastName?.[0] || ''}${e?.firstName?.[0] || ''}`.toUpperCase() || '?';

const GenderBadge = ({ gender }) => {
  if (!gender) return null;
  const isMale = String(gender).trim().toLowerCase() === 'male';
  return (
    <Chip
      size="small"
      icon={
        isMale ? (
          <MaleIcon style={{ fontSize: 11, color: '#1565C0' }} />
        ) : (
          <FemaleIcon style={{ fontSize: 11, color: '#c2185b' }} />
        )
      }
      label={gender}
      sx={{
        height: 18,
        fontSize: '0.6rem',
        fontWeight: 800,
        bgcolor: isMale ? 'rgba(21,101,192,0.08)' : 'rgba(194,24,91,0.08)',
        color: isMale ? '#1565C0' : '#c2185b',
        border: `1px solid ${isMale ? 'rgba(21,101,192,0.25)' : 'rgba(194,24,91,0.25)'}`,
        borderRadius: '4px',
      }}
    />
  );
};

const EmployeeSearchOptionRow = ({
  employee,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
}) => {
  if (!employee) return null;
  const profile = toProfileEmployee(employee);
  const num = String(profile.employeeNumber ?? '').trim();
  const name = buildDisplayName(profile);
  const dc = deptMap[num];
  const ec = empCatMap[num];
  const gender = sexMap[num] || profile.sex || profile.gender;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Avatar
        sx={{
          width: 30,
          height: 30,
          bgcolor: T.accent,
          fontSize: '0.65rem',
          fontWeight: 800,
          borderRadius: '4px',
          flexShrink: 0,
        }}
      >
        {getEmployeeInitials(profile)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.78rem',
            color: T.text,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45, flexWrap: 'wrap', mt: 0.25 }}>
          <Typography variant="caption" sx={{ color: T.faint, fontSize: '0.65rem' }}>
            #{num}
          </Typography>
          {gender && <GenderBadge gender={gender} />}
          {dc && <DeptBadge code={dc} />}
          {ec && <EmpCatBadge label={ec.label} colorHex={ec.colorHex} />}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Shared employee picker for attendance modules.
 * - Prominent input styling
 * - Enter to select highlighted result
 * - Arrow Up/Down to move highlight
 */
const AttendanceEmployeeSearchField = ({
  searchApi = 'remittance',
  value = '',
  selectedEmployee = null,
  onSelectEmployee,
  onSelect,
  onClear,
  onSearchQueryChange,
  onLoadingChange,
  browseOnFocus = false,
  disabled = false,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
}) => {
  const [query, setQuery] = useState(value || '');
  const [debouncedQuery, setDebouncedQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const pendingEnterRef = useRef(false);

  const selectedId = getEmployeeIdentifier(selectedEmployee);
  const hasSelection = Boolean(selectedEmployee && selectedId);

  const getDisplayQuery = useCallback(() => {
    if (selectedEmployee) {
      return buildDisplayName(toProfileEmployee(selectedEmployee)) || selectedId || value || '';
    }
    return value || '';
  }, [selectedEmployee, selectedId, value]);

  useEffect(() => {
    setQuery(getDisplayQuery());
    setDebouncedQuery(value || '');
  }, [value, selectedEmployee, getDisplayQuery]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const runSearch = useCallback((q, { browseAll = false } = {}) => {
    if (abortRef.current) abortRef.current.abort();
    const trimmed = String(q || '').trim();

    if (!browseAll && trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const url = searchApi === 'users'
      ? `${API_BASE_URL}/users/search`
      : `${API_BASE_URL}/Remittance/employees/search`;

    const params = browseAll && !trimmed
      ? {}
      : { q: trimmed };

    axios
      .get(url, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setResults(list.slice(0, 20));
        setHighlightIndex(0);
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });

    return () => controller.abort();
  }, [searchApi, onLoadingChange]);

  useEffect(() => {
    if (!open) return undefined;
    return runSearch(debouncedQuery, { browseAll: browseOnFocus && !debouncedQuery.trim() });
  }, [debouncedQuery, open, browseOnFocus, runSearch]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-emp-idx="${highlightIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open, results.length]);

  const queueSearch = (nextValue) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(nextValue);
      setOpen(true);
    }, 220);
  };

  const flushSearch = (nextValue) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setDebouncedQuery(nextValue);
    setOpen(true);
  };

  const emitSelect = (emp) => {
    const profile = toProfileEmployee(emp);
    const num = getEmployeeIdentifier(profile);
    onSelectEmployee?.(profile, num);
    onSelect?.(profile);
    setQuery(buildDisplayName(profile) || num);
    setDebouncedQuery(num);
    setOpen(false);
    setResults([]);
    onSearchQueryChange?.(num);
  };

  const handleSelect = (emp) => {
    if (!emp) return;
    emitSelect(emp);
  };

  useEffect(() => {
    if (!pendingEnterRef.current || results.length === 0 || loading) return;
    pendingEnterRef.current = false;
    handleSelect(results[highlightIndex] ?? results[0]);
  }, [results, highlightIndex, loading]);

  const handleInputChange = (e) => {
    const next = e.target.value;
    if (selectedEmployee) onClear?.();
    onSelectEmployee?.(null, next);
    setQuery(next);
    onSearchQueryChange?.(next.trim());
    queueSearch(next);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setOpen(false);
    setLoading(false);
    onLoadingChange?.(false);
    onSearchQueryChange?.('');
    onSelectEmployee?.(null, '');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setOpen(true);
    if (browseOnFocus && !query.trim() && !results.length && !loading) {
      runSearch('', { browseAll: true });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlightIndex((idx) => Math.min(results.length - 1, idx + 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((idx) => Math.max(0, idx - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      flushSearch(query);
      if (results.length > 0) {
        handleSelect(results[highlightIndex] ?? results[0]);
        return;
      }
      pendingEnterRef.current = true;
      runSearch(query, { browseAll: browseOnFocus && !query.trim() });
    }
  };

  const emptyMessage = browseOnFocus
    ? (query.trim().length >= 2 ? `No results for "${query.trim()}"` : 'Type to search or browse the list')
    : (query.trim().length >= 2 ? `No results for "${query.trim()}"` : 'Type at least 2 characters to search');

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <TextField
        inputRef={inputRef}
        fullWidth
        size="small"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search employee name or number…"
        disabled={disabled}
        autoComplete="off"
        inputProps={{ autoComplete: 'new-password', style: { fontSize: '0.84rem', fontWeight: 600 } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            bgcolor: '#fff',
            minHeight: 42,
            '& fieldset': {
              borderColor: hasSelection ? T.accent : alpha(T.accent, 0.45),
              borderWidth: hasSelection ? 2 : 1.5,
            },
            '&:hover fieldset': { borderColor: T.accent },
            '&.Mui-focused fieldset': {
              borderColor: T.accent,
              borderWidth: 2,
              boxShadow: `0 0 0 3px ${alpha(T.accent, 0.12)}`,
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person sx={{ color: T.accent, fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={16} sx={{ color: T.accent }} />
              ) : query ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.35 }} aria-label="Clear employee">
                  <Close sx={{ fontSize: 16, color: T.faint }} />
                </IconButton>
              ) : (
                <SearchOutlined sx={{ fontSize: 18, color: T.muted }} />
              )}
            </InputAdornment>
          ),
        }}
      />

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1400,
            maxHeight: 280,
            overflow: 'auto',
            borderRadius: '12px',
            border: `1.5px solid ${T.accentBorder}`,
            boxShadow: `0 12px 32px ${alpha(T.accent, 0.16)}`,
          }}
        >
          <Box
            sx={{
              px: 1.25,
              py: 0.75,
              bgcolor: T.accentFaint,
              borderBottom: `1px solid ${T.divider}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.muted, letterSpacing: '0.04em' }}>
              {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
              <KeyboardReturn sx={{ fontSize: 12, color: T.faint }} />
              <Typography sx={{ fontSize: '0.6rem', color: T.faint }}>Enter to select</Typography>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2.5 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Searching employees…</Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding ref={listRef}>
              {results.map((emp, idx) => {
                const key = getEmployeeIdentifier(emp) || emp.employeeNumber || idx;
                const active = idx === highlightIndex;
                return (
                  <ListItemButton
                    key={key}
                    data-emp-idx={idx}
                    selected={active}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => handleSelect(emp)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: active ? alpha(T.accent, 0.1) : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: alpha(T.accent, 0.12),
                        '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                      },
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <EmployeeSearchOptionRow
                      employee={emp}
                      deptMap={deptMap}
                      empCatMap={empCatMap}
                      sexMap={sexMap}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          ) : (
            <Box sx={{ py: 2.5, px: 1.5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontStyle: 'italic' }}>
                {emptyMessage}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default AttendanceEmployeeSearchField;
