import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  styled,
  CircularProgress,
  Paper,
  TextField,
  List,
  ListItemButton,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { SearchOutlined, Close as CloseIcon } from '@mui/icons-material';
import { FILTER_T as DEFAULT_T } from './attendanceFilterLayout';

export const formatFullNameForSearch = (fullName) => {
  if (!fullName) return '';
  const cleaned = String(fullName).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  if (cleaned.includes(',')) return cleaned;
  const parts = cleaned.split(' ');
  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);
  let suffix = '';
  if (suffixes.has(parts[parts.length - 1]?.toUpperCase())) suffix = parts.pop();
  if (parts.length === 1) return suffix ? `${parts[0]} ${suffix}` : parts[0];
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleFormatted = parts.slice(1, parts.length - 1).map((m) => {
    const mm = String(m).replace(/\./g, '');
    return mm.length === 1 ? `${mm.toUpperCase()}.` : m;
  }).join(' ');
  const base = `${lastName.toUpperCase()}, ${firstName.toUpperCase()}${middleFormatted ? ` ${middleFormatted.toUpperCase()}` : ''}`;
  return suffix ? `${base} ${suffix}` : base;
};

/** Prefer structured last/first/middle from API — handles compound surnames like "San Jose". */
export const buildDisplayName = (e) => {
  const last = (e?.lastName || '').trim();
  const first = (e?.firstName || '').trim();
  const mid = (e?.middleName || '').trim();
  const ext = (e?.nameExtension || '').trim();
  if (last || first) {
    const given = [first, mid].filter(Boolean).join(' ');
    const base = last ? `${last.toUpperCase()}, ${given}` : given;
    return ext ? `${base} ${ext}` : base;
  }
  const raw = String(e?.fullName || e?.name || '').trim();
  if (!raw) return '';
  if (raw.includes(',')) return raw;
  return formatFullNameForSearch(raw);
};

export const formatEmployeeFieldValue = (num, name) => {
  const n = String(num || '').trim();
  const nm = String(name || '').trim();
  if (n && nm) return `${n} | ${nm}`;
  return n;
};

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: DEFAULT_T.accentBorder },
    '&:hover fieldset': { borderColor: DEFAULT_T.accent },
    '&.Mui-focused fieldset': { borderColor: DEFAULT_T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: DEFAULT_T.accent },
});

export const EmployeeSearchField = ({
  value,
  displayName = '',
  onSelectEmployeeNumber,
  onSelectEmployeeName,
  onSelectEmployee,
  onSearchQueryChange,
  disabled = false,
  themeT = DEFAULT_T,
}) => {
  const T = themeT;
  const [query, setQuery] = useState(() => formatEmployeeFieldValue(value, displayName));
  const [debouncedQuery, setDebouncedQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const pendingEnterRef = useRef(false);

  useEffect(() => {
    setQuery(formatEmployeeFieldValue(value, displayName));
    setDebouncedQuery(value || '');
  }, [value, displayName]);

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

  useEffect(() => {
    if (!open) return;
    if (abortRef.current) abortRef.current.abort();
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    axios.get(`${API_BASE_URL}/users/search`, {
      params: { q },
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
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery, open]);

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

  const handleSelect = (emp) => {
    if (!emp) return;
    const num = emp?.employeeNumber ? String(emp.employeeNumber) : '';
    const name = buildDisplayName(emp);
    onSelectEmployeeNumber(num);
    onSelectEmployeeName?.(name);
    onSelectEmployee?.(emp);
    setQuery(formatEmployeeFieldValue(num, name));
    setDebouncedQuery(num);
    setOpen(false);
    setResults([]);
    onSearchQueryChange?.(num);
  };

  useEffect(() => {
    if (!pendingEnterRef.current || results.length === 0 || loading) return;
    pendingEnterRef.current = false;
    handleSelect(results[highlightIndex] ?? results[0]);
  }, [results, highlightIndex, loading]);

  const handleInputChange = (e) => {
    const next = e.target.value;
    onSelectEmployeeNumber(next);
    onSelectEmployeeName?.('');
    onSelectEmployee?.(null);
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
    onSelectEmployeeNumber('');
    onSelectEmployeeName?.('');
    onSearchQueryChange?.('');
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
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <FieldInput
        fullWidth
        size="small"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Type name or employee number..."
        disabled={disabled}
        autoComplete="off"
        inputProps={{ autoComplete: 'new-password' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined sx={{ color: T.muted, fontSize: 16 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={14} sx={{ color: T.accent }} />
              ) : query ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                  <CloseIcon sx={{ fontSize: 14, color: T.faint }} />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
      />
      {open && (
        <Paper
          elevation={6}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            maxHeight: 280,
            overflow: 'auto',
            borderRadius: '10px',
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2.5 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Searching...</Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding ref={listRef}>
              {results.map((emp, idx) => {
                const active = idx === highlightIndex;
                return (
                  <ListItemButton
                    key={emp.employeeNumber}
                    data-emp-idx={idx}
                    selected={active}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => handleSelect(emp)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: active ? T.accentFaint : 'transparent',
                      '&:hover': { bgcolor: T.accentFaint },
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                        {buildDisplayName(emp)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                        #{emp.employeeNumber}
                      </Typography>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          ) : (
            <Box sx={{ py: 2.5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontStyle: 'italic' }}>
                {query.trim().length >= 2
                  ? `No registered user found for "${query.trim()}"`
                  : 'Type at least 2 characters to search users'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};
