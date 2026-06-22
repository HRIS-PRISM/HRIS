import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import axios from 'axios';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  Grid,
  IconButton,
  List,
  ListItem,
  MenuItem,
  Paper,
  Select,
  FormControl,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  styled,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Refresh,
  Reorder,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  UploadFile as UploadFileIcon,
  InsertDriveFile as InsertDriveFileIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { Description as DescriptionIcon } from '@mui/icons-material';

import AccessDenied from '../AccessDenied';
import ComingSoon from '../ComingSoon';
import API_BASE_URL from '../../apiConfig';
import usePageAccess from '../../hooks/usePageAccess';
import { getAuthHeaders, getUserInfo } from '../../utils/auth';

// Toggle off when FILE 201 is ready for release
const FILE201_COMING_SOON = true;

// ─── Theme tokens ─────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven: '#ffffff',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
  poppins: "'Poppins', sans-serif",
};

// ─── File type → emoji icon ───────────────────────────────────
const FILE_ICON = {
  'Service Record': '🗂️',
  Appointment: '📋',
  Contract: '📄',
  SALN: '💼',
  'Leave Records': '📅',
  'Training Certificates': '🏅',
  'Performance Documents': '📊',
  Other: '📁',
};

// ─── Styled primitives ────────────────────────────────────────
const SectionCard = styled(Paper)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: T.text },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const selectSx = {
  borderRadius: '8px',
  fontSize: '0.875rem',
  bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: T.accent,
    borderWidth: '1.5px',
  },
};

const fieldLabelSx = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: alpha(T.accent, 0.45),
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  mb: 0.5,
  fontFamily: T.poppins,
};

const FILE_TYPES = [
  'Service Record',
  'Appointment',
  'Contract',
  'SALN',
  'Leave Records',
  'Training Certificates',
  'Performance Documents',
  'Other',
];

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const formatDateShort = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// ─── Employee Autocomplete ────────────────────────────────────
const EmployeeAutocomplete = ({
  value,
  onChange,
  placeholder = 'Search employee...',
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  selectedEmployee,
  onEmployeeSelect,
}) => {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (selectedEmployee)
      setQuery(selectedEmployee.fullName || selectedEmployee.name || '');
    else if (!value) setQuery('');
  }, [selectedEmployee, value]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchEmployees = async (q) => {
    setIsLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/file201/admin/employees${q ? `?q=${encodeURIComponent(q)}` : ''}`,
        getAuthHeaders(),
      );
      setEmployees(r.data.employees || r.data || []);
    } catch {
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowDropdown(true);
    if (
      selectedEmployee &&
      v !== (selectedEmployee.fullName || selectedEmployee.name)
    ) {
      onEmployeeSelect(null);
      onChange('');
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchEmployees(v.trim().length >= 2 ? v : '');
    }, 300);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <FieldInput
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setShowDropdown(true);
          if (!employees.length && !isLoading) fetchEmployees('');
        }}
        onKeyDown={(e) => e.key === 'Escape' && setShowDropdown(false)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: (
            <PersonIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />
          ),
          endAdornment: (
            <IconButton
              onClick={() => {
                if (!showDropdown) {
                  setShowDropdown(true);
                  if (!employees.length && !isLoading) fetchEmployees('');
                } else setShowDropdown(false);
              }}
              size="small"
              sx={{ color: T.muted }}
            >
              {showDropdown ? (
                <ExpandLessIcon sx={{ fontSize: 15 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          ),
        }}
      />
      {showDropdown && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: 280,
            overflow: 'auto',
            mt: 0.75,
            borderRadius: 2,
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2,
                gap: 1,
              }}
            >
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>
                Loading…
              </Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem
                  key={emp.employeeNumber}
                  button
                  onClick={() => {
                    onEmployeeSelect(emp);
                    setQuery(emp.fullName || emp.name || '');
                    setShowDropdown(false);
                    onChange(emp.employeeNumber);
                  }}
                  sx={{
                    py: 1,
                    px: 1.5,
                    '&:hover': { bgcolor: T.accentFaint },
                    borderBottom: `1px solid ${T.divider}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: '0.72rem',
                        bgcolor: T.accent,
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {(emp.fullName || emp.name || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: T.text,
                        }}
                      >
                        {emp.fullName || emp.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                        #{emp.employeeNumber}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography
                sx={{ fontSize: '0.8rem', color: T.faint, fontStyle: 'italic' }}
              >
                No employees found
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── File Preview Dialog ──────────────────────────────────────
const PDF_ZOOM_LEVELS = [50, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300];
const PDF_ZOOM_DEFAULT = 100;

const FilePreviewDialog = ({ open, doc, onClose, onDownload, isAdminView }) => {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfZoom, setPdfZoom] = useState(PDF_ZOOM_DEFAULT);
  const [iframeKey, setIframeKey] = useState(0);

  const mimeType = useMemo(() => {
    if (!doc) return '';
    const name = (doc.file_name || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.gif')) return 'image/gif';
    if (name.endsWith('.webp')) return 'image/webp';
    return doc.mime_type || '';
  }, [doc]);

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isPreviewable = isImage || isPdf;

  const currentZoomIdx = PDF_ZOOM_LEVELS.indexOf(pdfZoom);
  const canZoomIn = currentZoomIdx < PDF_ZOOM_LEVELS.length - 1;
  const canZoomOut = currentZoomIdx > 0;

  const applyZoom = (newZoom) => {
    setPdfZoom(newZoom);
    setIframeKey((k) => k + 1);
  };
  const zoomIn = () => {
    if (canZoomIn) applyZoom(PDF_ZOOM_LEVELS[currentZoomIdx + 1]);
  };
  const zoomOut = () => {
    if (canZoomOut) applyZoom(PDF_ZOOM_LEVELS[currentZoomIdx - 1]);
  };
  const zoomReset = () => applyZoom(PDF_ZOOM_DEFAULT);

  useEffect(() => {
    if (open) {
      setPdfZoom(PDF_ZOOM_DEFAULT);
      setIframeKey((k) => k + 1);
    }
  }, [open, doc?.id]);

  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;
    let url = '';
    const fetchBlob = async () => {
      setLoading(true);
      setError('');
      setBlobUrl('');
      try {
        const endpoint = isAdminView
          ? `${API_BASE_URL}/file201/admin/documents/${doc.id}/download?inline=1`
          : `${API_BASE_URL}/file201/me/documents/${doc.id}/download?inline=1`;
        const response = await axios.get(endpoint, {
          ...getAuthHeaders(),
          responseType: 'blob',
        });
        if (cancelled) return;
        const blob = new Blob([response.data], {
          type: mimeType || 'application/octet-stream',
        });
        url = window.URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        if (!cancelled) setError('Failed to load file preview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBlob();
    return () => {
      cancelled = true;
      if (url) window.URL.revokeObjectURL(url);
    };
  }, [open, doc?.id, isAdminView]);

  useEffect(() => {
    if (!open && blobUrl) {
      window.URL.revokeObjectURL(blobUrl);
      setBlobUrl('');
    }
  }, [open]);

  const pdfSrc = blobUrl
    ? `${blobUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=${pdfZoom}`
    : '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          background: T.headerGrad,
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#fff',
              fontFamily: T.poppins,
            }}
            noWrap
          >
            {doc?.file_name || 'File Preview'}
          </Typography>
          <Typography
            sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}
          >
            {doc?.file_type || ''}
            {doc?.employee_name ? ` • ${doc.employee_name}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <AccentButton
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => onDownload(doc)}
            sx={{
              height: 32,
              fontSize: '0.78rem',
              borderColor: 'rgba(255,255,255,0.4)',
              color: '#fff',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.12)',
                borderColor: '#fff',
                transform: 'none',
              },
            }}
          >
            Download
          </AccentButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: 'rgba(255,255,255,0.75)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
            }}
          >
            <Close sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          bgcolor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <CircularProgress size={32} sx={{ color: T.accent }} />
            <Typography sx={{ color: T.muted, fontSize: '0.82rem' }}>
              Loading preview…
            </Typography>
          </Box>
        )}
        {error && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography sx={{ color: T.muted, fontSize: '0.78rem' }}>
              You can still download the file using the button above.
            </Typography>
          </Box>
        )}
        {!loading && !error && blobUrl && isPdf && (
          <Box
            component="iframe"
            key={iframeKey}
            src={pdfSrc}
            title={doc?.file_name}
            sx={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              bgcolor: '#fff',
            }}
          />
        )}
        {!loading && !error && blobUrl && isImage && (
          <Box
            component="img"
            src={blobUrl}
            alt={doc?.file_name}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              borderRadius: 1,
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
          />
        )}
        {!loading && !error && blobUrl && !isPreviewable && (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <DescriptionIcon
              sx={{ fontSize: 56, color: alpha(T.accent, 0.2), mb: 2 }}
            />
            <Typography sx={{ color: T.text, fontWeight: 600, mb: 0.5 }}>
              Preview not available
            </Typography>
            <Typography sx={{ color: T.muted, fontSize: '0.78rem', mb: 2 }}>
              This file type cannot be previewed in the browser.
            </Typography>
            <AccentButton
              variant="contained"
              startIcon={<DownloadIcon sx={{ fontSize: '14px !important' }} />}
              onClick={() => onDownload(doc)}
              sx={{
                bgcolor: T.accent,
                color: '#fff',
                '&:hover': { bgcolor: T.accentDark },
              }}
            >
              Download File
            </AccentButton>
          </Box>
        )}
        {!loading && !error && blobUrl && isPdf && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'rgba(30,30,30,0.82)',
              backdropFilter: 'blur(8px)',
              borderRadius: '10px',
              px: 1.5,
              py: 0.75,
              boxShadow: '0 4px 20px rgba(0,0,0,0.28)',
              border: '1px solid rgba(255,255,255,0.1)',
              zIndex: 10,
            }}
          >
            <Tooltip title="Zoom out">
              <span>
                <IconButton
                  size="small"
                  onClick={zoomOut}
                  disabled={!canZoomOut}
                  sx={{
                    width: 30,
                    height: 30,
                    color: canZoomOut ? '#fff' : 'rgba(255,255,255,0.28)',
                    borderRadius: '6px',
                    '&:hover': canZoomOut
                      ? { bgcolor: 'rgba(255,255,255,0.14)' }
                      : {},
                  }}
                >
                  <Box
                    component="span"
                    sx={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}
                  >
                    −
                  </Box>
                </IconButton>
              </span>
            </Tooltip>
            <Select
              value={pdfZoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              size="small"
              variant="standard"
              disableUnderline
              sx={{
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 700,
                minWidth: 62,
                textAlign: 'center',
                '& .MuiSelect-select': {
                  textAlign: 'center',
                  py: 0,
                  px: 0.5,
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                },
                '& .MuiSelect-icon': {
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '1rem',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: 'rgba(30,30,30,0.96)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    '& .MuiMenuItem-root': {
                      fontSize: '0.78rem',
                      color: '#fff',
                      justifyContent: 'center',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                      '&.Mui-selected': {
                        bgcolor: alpha(T.accent, 0.5),
                        '&:hover': { bgcolor: alpha(T.accent, 0.65) },
                      },
                    },
                  },
                },
              }}
            >
              {PDF_ZOOM_LEVELS.map((z) => (
                <MenuItem key={z} value={z}>
                  {z}%
                </MenuItem>
              ))}
            </Select>
            <Tooltip title="Zoom in">
              <span>
                <IconButton
                  size="small"
                  onClick={zoomIn}
                  disabled={!canZoomIn}
                  sx={{
                    width: 30,
                    height: 30,
                    color: canZoomIn ? '#fff' : 'rgba(255,255,255,0.28)',
                    borderRadius: '6px',
                    '&:hover': canZoomIn
                      ? { bgcolor: 'rgba(255,255,255,0.14)' }
                      : {},
                  }}
                >
                  <Box
                    component="span"
                    sx={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}
                  >
                    +
                  </Box>
                </IconButton>
              </span>
            </Tooltip>
            <Box
              sx={{
                width: '1px',
                height: 18,
                bgcolor: 'rgba(255,255,255,0.2)',
                mx: 0.5,
              }}
            />
            <Tooltip title="Reset to 100%">
              <Box
                onClick={zoomReset}
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: '6px',
                  cursor: pdfZoom !== PDF_ZOOM_DEFAULT ? 'pointer' : 'default',
                  bgcolor:
                    pdfZoom !== PDF_ZOOM_DEFAULT
                      ? 'rgba(255,255,255,0.12)'
                      : 'transparent',
                  border: '1px solid',
                  borderColor:
                    pdfZoom !== PDF_ZOOM_DEFAULT
                      ? 'rgba(255,255,255,0.25)'
                      : 'transparent',
                  '&:hover':
                    pdfZoom !== PDF_ZOOM_DEFAULT
                      ? { bgcolor: 'rgba(255,255,255,0.2)' }
                      : {},
                  transition: 'all 0.15s',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color:
                      pdfZoom !== PDF_ZOOM_DEFAULT
                        ? '#fff'
                        : 'rgba(255,255,255,0.35)',
                  }}
                >
                  RESET
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

// ─── Staff Document Card (hover slide-up actions) ─────────────
const StaffDocCard = ({ doc, onPreview, onDownload, getFileIcon }) => {
  const [hovered, setHovered] = useState(false);
  const icon = FILE_ICON[doc.file_type] || '📁';
  const ext = (doc.file_name || '').split('.').pop().toUpperCase();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 14,
        background: '#fff',
        border: `1px solid ${hovered ? T.accent : T.accentBorder}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? '0 8px 28px rgba(109,35,35,0.18)'
          : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
        fontFamily: T.poppins,
      }}
    >
      {/* Top accent strip */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${T.accent}, ${T.accentMid})`,
          flexShrink: 0,
        }}
      />

      {/* Card body */}
      <div style={{ padding: '16px 16px 14px', flexGrow: 1 }}>
        {/* Icon row + ext badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
<div
  style={{
    display: 'grid',
    gridTemplateColumns: '40px 1fr',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  }}
>
  {/* ICON */}
  <div
    style={{
      width: 34,
      height: 34,
      borderRadius: 8,
      background: 'rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {getFileIcon(doc.file_name)}
  </div>

  {/* FILENAME */}
  <div
    style={{
      fontSize: '0.82rem',
      fontWeight: 700,
      color: '#1a1a1a',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {doc.file_name}
  </div>
</div>
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: T.accent,
              background: 'rgba(109,35,35,0.08)',
              border: `1px solid ${T.accentBorder}`,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            {ext}
          </span>
        </div>

        {/* Type chip */}
        <div
          style={{
            display: 'inline-block',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: T.accent,
            background: 'rgba(109,35,35,0.07)',
            border: `1px solid ${T.accentBorder}`,
            borderRadius: 20,
            padding: '2px 10px',
            marginBottom: 10,
          }}
        >
          {doc.file_type}
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Uploaded by */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11 }}>🕐</span>
            <span style={{ fontSize: '0.68rem', color: T.muted }}>
              Uploaded by{' '}
              <strong style={{ color: T.text }}>
                {doc.uploaded_by || doc.employee_name || '—'}
              </strong>
            </span>
          </div>
          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11 }}>📆</span>
            <span style={{ fontSize: '0.68rem', color: T.muted }}>
              {formatDateShort(doc.upload_date)}
            </span>
          </div>
          {/* Employee number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11 }}>🪪</span>
            <span style={{ fontSize: '0.68rem', color: T.muted }}>
              #{doc.employee_number}
            </span>
          </div>
          {/* Remarks */}
          {doc.remarks ? (
            <div
              style={{
                marginTop: 4,
                fontSize: '0.68rem',
                color: T.muted,
                background: 'rgba(0,0,0,0.025)',
                borderLeft: `2.5px solid ${T.accentBorder}`,
                borderRadius: '0 4px 4px 0',
                padding: '4px 8px',
                fontStyle: 'italic',
                lineHeight: 1.45,
              }}
            >
              "{doc.remarks}"
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Slide-up action bar (translateY, same technique as payroll floating bar) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: `linear-gradient(135deg, ${T.accent} 0%, #7e2c2c 100%)`,
          display: 'flex',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          transform: hovered ? 'translateY(0%)' : 'translateY(100%)',
          transition: 'transform 0.26s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2,
        }}
      >
        <button
          onClick={() => onPreview(doc)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '12px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRight: '1px solid rgba(255,255,255,0.15)',
            transition: 'background 0.14s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Preview
        </button>
        <button
          onClick={() => onDownload(doc)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '12px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 0.14s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>

      {/* Spacer so card content clears the action bar height */}
      <div style={{ height: 44, flexShrink: 0 }} />
    </div>
  );
};

// ─── Staff Tab Filter Bar ─────────────────────────────────────
const StaffTabFilter = ({ documents, activeTab, onTabChange }) => {
  const availableTabs = [
    'All',
    ...FILE_TYPES.filter((t) => documents.some((d) => d.file_type === t)),
  ];

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: 2,
        p: 1.5,
        mb: 2,
        border: `1px solid ${T.accentBorder}`,
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        overflowX: 'auto',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'nowrap',
          minWidth: 'max-content',
        }}
      >
        {availableTabs.map((tab) => {
          const count =
            tab === 'All'
              ? documents.length
              : documents.filter((d) => d.file_type === tab).length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                border: isActive
                  ? `1.5px solid ${T.accent}`
                  : `1.5px solid ${T.accentBorder}`,
                borderRadius: 30,
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: isActive ? '#fff' : T.muted,
                background: isActive
                  ? `linear-gradient(135deg, ${T.accent}, #7e2c2c)`
                  : 'transparent',
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'all 0.16s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                boxShadow: isActive
                  ? `0 3px 10px rgba(109,35,35,0.25)`
                  : 'none',
                fontFamily: T.poppins,
              }}
            >
              {tab !== 'All' && FILE_ICON[tab] && (
                <span style={{ fontSize: 12 }}>{FILE_ICON[tab]}</span>
              )}
              {tab}
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  background: isActive
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(109,35,35,0.1)',
                  color: isActive ? '#fff' : T.accent,
                  borderRadius: 10,
                  padding: '1px 6px',
                  minWidth: 18,
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────
const File201Admin = () => {
  const userInfo = getUserInfo();
  const role = String(userInfo?.role || '').toLowerCase();

  const isAdminView = ['administrator', 'superadmin', 'technical'].includes(
    role,
  );
  const isStaff = role === 'staff';

  const { hasAccess, loading: accessLoading } = usePageAccess('file201');

  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);
  const [filePreviewDoc, setFilePreviewDoc] = useState(null);

  // Staff-only: active tab filter
  const [staffActiveTab, setStaffActiveTab] = useState('All');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  // Upload form (admin only)
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [fileType, setFileType] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState(null);

  // Edit modal (admin only)
  const [editOpen, setEditOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editFileType, setEditFileType] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  const loadDocuments = async () => {
    const endpoint = isAdminView
      ? `${API_BASE_URL}/file201/admin/documents`
      : `${API_BASE_URL}/file201/me/documents`;
    const response = await axios.get(endpoint, getAuthHeaders());
    return response.data.documents || [];
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const docs = await loadDocuments();
      setDocuments(docs);
      setFilteredDocs(docs);
    } catch (err) {
      showSnackbar(
        err.response?.data?.message || 'Failed to load FILE 201 data.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Admin search filter
  useEffect(() => {
    if (!isAdminView) return;
    const q = searchQuery.toLowerCase();
    setFilteredDocs(
      documents.filter(
        (d) =>
          d.file_name?.toLowerCase().includes(q) ||
          d.file_type?.toLowerCase().includes(q) ||
          d.employee_name?.toLowerCase().includes(q) ||
          d.employee_number?.toLowerCase().includes(q),
      ),
    );
    setPage(0);
  }, [searchQuery, documents, isAdminView]);

  // Staff tab filter
  const staffFilteredDocs = useMemo(() => {
    if (!isStaff) return documents;
    return staffActiveTab === 'All'
      ? documents
      : documents.filter((d) => d.file_type === staffActiveTab);
  }, [documents, staffActiveTab, isStaff]);

  const clearForm = () => {
    setEmployeeNumber('');
    setSelectedEmployee(null);
    setFileType('');
    setRemarks('');
    setFile(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!isAdminView) return;
    if (!employeeNumber || !fileType || !file) {
      showSnackbar(
        'Employee, file type, and document file are required.',
        'error',
      );
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('employeeNumber', employeeNumber);
      formData.append('fileType', fileType);
      formData.append('remarks', remarks);
      formData.append('file', file);
      const auth = getAuthHeaders({ includeContentType: false });
      await axios.post(
        `${API_BASE_URL}/file201/admin/documents`,
        formData,
        auth,
      );
      showSnackbar('Document uploaded successfully.');
      clearForm();
      const docs = await loadDocuments();
      setDocuments(docs);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (doc) => {
    if (!isAdminView) return;
    setEditingDoc(doc);
    setEditFileType(doc.file_type || '');
    setEditRemarks(doc.remarks || '');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!isAdminView || !editingDoc || !editFileType) {
      showSnackbar('File type is required.', 'error');
      return;
    }
    try {
      setSaving(true);
      await axios.put(
        `${API_BASE_URL}/file201/admin/documents/${editingDoc.id}`,
        { fileType: editFileType, remarks: editRemarks },
        getAuthHeaders(),
      );
      showSnackbar('Document metadata updated.');
      setEditOpen(false);
      setEditingDoc(null);
      const docs = await loadDocuments();
      setDocuments(docs);
    } catch (err) {
      showSnackbar(
        err.response?.data?.message || 'Failed to update metadata.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!isAdminView) return;
    const confirmed = window.confirm(
      `Delete ${doc.file_name}? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      setDeletingId(doc.id);
      await axios.delete(
        `${API_BASE_URL}/file201/admin/documents/${doc.id}`,
        getAuthHeaders(),
      );
      showSnackbar('Document deleted successfully.');
      const docs = await loadDocuments();
      setDocuments(docs);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Delete failed.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'pdf':
        return <PictureAsPdfIcon sx={{ fontSize: 20, color: '#d32f2f' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return <ImageIcon sx={{ fontSize: 20, color: '#1976d2' }} />;
      case 'doc':
      case 'docx':
        return <DescriptionIcon sx={{ fontSize: 20, color: '#1565c0' }} />;
      default:
        return <InsertDriveFileIcon sx={{ fontSize: 20, color: '#6b6b6b' }} />;
    }
  };

  const downloadFile = async (doc) => {
    try {
      const endpoint = isAdminView
        ? `${API_BASE_URL}/file201/admin/documents/${doc.id}/download?inline=0`
        : `${API_BASE_URL}/file201/me/documents/${doc.id}/download?inline=0`;
      const response = await axios.get(endpoint, {
        ...getAuthHeaders(),
        responseType: 'blob',
      });
      const contentType =
        response.headers?.['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Download failed.', 'error');
    }
  };

  const openFilePreview = (doc) => setFilePreviewDoc(doc);
  const paginatedDocs = filteredDocs.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  if (accessLoading || (!FILE201_COMING_SOON && loading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress sx={{ color: T.accent }} />
      </Box>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        title="Access Required"
        message="You do not have page access for FILE 201."
        returnPath="/home"
        returnButtonText="Back to Home"
      />
    );
  }

  if (!isAdminView && !isStaff) {
    return (
      <AccessDenied
        title="Access Restricted"
        message="Your role does not have permission to access FILE 201."
        returnPath="/home"
        returnButtonText="Back to Home"
      />
    );
  }

  if (FILE201_COMING_SOON) {
    return (
      <ComingSoon
        title="FILE 201"
        subtitle="Next project — under development"
        message="The FILE 201 module is currently being built by the development team. Stay tuned for updates — it will be available in a future release."
        showReturnButton={false}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ── STAFF LAYOUT ─────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  if (isStaff) {
    return (
      <>
        <Fade in timeout={400}>
          <Box
            sx={{
              py: { xs: 1, md: 2 },
              mt: { xs: 0, md: -2 },
              mb: { xs: 1, md: 2 },
              width: '100vw',
              maxWidth: '100%',
              position: 'relative',
              left: '63%',
              transform: 'translateX(-61%)',
              px: { xs: 2, sm: 3, md: 6 },
            }}
          >
            {/* ── Page Header ── */}
            <SectionCard sx={{ mb: 2 }}>
              <Box
                sx={{
                  px: 4,
                  py: 3,
                  background:
                    'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 32, color: T.accent }} />
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: T.accent,
                        lineHeight: 1.2,
                        mb: 0.3,
                        fontFamily: T.poppins,
                      }}
                    >
                      My FILE 201 Records
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.82rem',
                        color: T.accentMid,
                        fontWeight: 700,
                        opacity: 0.9,
                        fontFamily: T.poppins,
                      }}
                    >
                      View and download your personal 201 documents
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
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
                        fontSize: '0.8rem',
                        color: T.accent,
                        fontWeight: 700,
                        fontFamily: T.poppins,
                      }}
                    >
                      {documents.length}{' '}
                      {documents.length === 1 ? 'document' : 'documents'}
                    </Typography>
                  </Box>
                  <Tooltip title="Refresh">
                    <IconButton
                      onClick={loadAll}
                      sx={{
                        bgcolor: alpha(T.accent, 0.08),
                        color: T.accent,
                        width: 36,
                        height: 36,
                        '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                      }}
                    >
                      <Refresh sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </SectionCard>

            {/* ── Tab Filter ── */}
            <StaffTabFilter
              documents={documents}
              activeTab={staffActiveTab}
              onTabChange={(tab) => {
                setStaffActiveTab(tab);
                setPage(0);
              }}
            />

            {/* ── Cards Grid ── */}
            {staffFilteredDocs.length === 0 ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: T.accentFaint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <DescriptionIcon
                    sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: T.muted,
                    mb: 0.5,
                    fontFamily: T.poppins,
                  }}
                >
                  {documents.length === 0
                    ? 'No documents yet'
                    : 'No documents in this category'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: T.faint,
                    fontFamily: T.poppins,
                  }}
                >
                  {documents.length === 0
                    ? 'No FILE 201 documents have been uploaded for you yet.'
                    : 'Try selecting a different category tab.'}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: '14px',
                }}
              >
                {staffFilteredDocs.map((doc) => (
                  <StaffDocCard
  key={doc.id}
  doc={doc}
  onPreview={openFilePreview}
  onDownload={downloadFile}
  getFileIcon={getFileIcon}
/>
                ))}
              </Box>
            )}
          </Box>
        </Fade>

        {/* ── File Preview Dialog ── */}
        <FilePreviewDialog
          open={Boolean(filePreviewDoc)}
          doc={filePreviewDoc}
          onClose={() => setFilePreviewDoc(null)}
          onDownload={downloadFile}
          isAdminView={false}
        />

        {/* ── Snackbar ── */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%', borderRadius: 2 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ── ADMIN LAYOUT (unchanged from original) ───────────────────
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Fade in timeout={400}>
        <Box
          sx={{
            py: { xs: 1, md: 2 },
            mt: { xs: 0, md: -2 },
            mb: { xs: 1, md: 2 },
            width: '100vw',
            maxWidth: '100%',
            position: 'relative',
            left: '63%',
            transform: 'translateX(-61%)',
            px: { xs: 2, sm: 3, md: 6 },
          }}
        >
          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2 }}>
            <Box
              sx={{
                px: 4,
                py: 3,
                background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -30,
                  left: '30%',
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <DescriptionIcon sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: T.accent,
                      lineHeight: 1.2,
                      mb: 0.3,
                    }}
                  >
                    FILE 201 Management
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      color: T.accentMid,
                      fontWeight: 700,
                      opacity: 0.9,
                    }}
                  >
                    Administrative Panel • Upload and manage employee 201
                    documents
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
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
                      fontSize: '0.8rem',
                      color: T.accent,
                      fontWeight: 700,
                    }}
                  >
                    {documents.length}{' '}
                    {documents.length === 1 ? 'document' : 'documents'}
                  </Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton
                    onClick={loadAll}
                    sx={{
                      bgcolor: alpha(T.accent, 0.08),
                      color: T.accent,
                      width: 36,
                      height: 36,
                      '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                    }}
                  >
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          <Grid container spacing={2}>
            {/* ── LEFT: Upload Form ── */}
            <Grid item xs={12} lg={4}>
              <SectionCard
                component="form"
                onSubmit={handleUpload}
                sx={{
                  height: 'calc(100vh - 280px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    px: 3.5,
                    py: 1.25,
                    borderBottom: `1px solid ${T.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: T.accentFaint,
                    flexShrink: 0,
                  }}
                >
                  <UploadFileIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: T.accent,
                    }}
                  >
                    Upload New Document
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                    <Box component="span" sx={{ color: '#c62828' }}>
                      *
                    </Box>{' '}
                    required
                  </Typography>
                </Box>

                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    flexGrow: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: T.accentBorder,
                      borderRadius: 2,
                    },
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: T.accent,
                        mb: 0.75,
                      }}
                    >
                      Employee <span style={{ color: '#c62828' }}>*</span>
                    </Typography>
                    <EmployeeAutocomplete
                      value={employeeNumber}
                      onChange={setEmployeeNumber}
                      selectedEmployee={selectedEmployee}
                      onEmployeeSelect={setSelectedEmployee}
                      placeholder="Search and select employee..."
                      required
                    />
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: T.accent,
                        mb: 0.75,
                      }}
                    >
                      File Type <span style={{ color: '#c62828' }}>*</span>
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={fileType}
                        onChange={(e) => setFileType(e.target.value)}
                        displayEmpty
                        sx={{
                          ...selectSx,
                          '& .MuiSelect-select': {
                            fontSize: '0.875rem',
                            py: '8.5px',
                          },
                        }}
                        renderValue={(v) =>
                          v || (
                            <em
                              style={{ color: T.faint, fontSize: '0.875rem' }}
                            >
                              Select file type
                            </em>
                          )
                        }
                      >
                        {FILE_TYPES.map((type) => (
                          <MenuItem
                            key={type}
                            value={type}
                            sx={{ fontSize: '0.875rem' }}
                          >
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: T.accent,
                        mb: 0.75,
                      }}
                    >
                      Remarks
                    </Typography>
                    <FieldInput
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      placeholder="Optional remarks…"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: T.accent,
                        mb: 0.75,
                      }}
                    >
                      Document File <span style={{ color: '#c62828' }}>*</span>
                    </Typography>
                    <AccentButton
                      variant="outlined"
                      component="label"
                      fullWidth
                      sx={{
                        borderColor: file ? T.accent : T.accentBorder,
                        color: file ? T.accent : T.muted,
                        bgcolor: file ? T.accentFaint : 'transparent',
                        justifyContent: 'flex-start',
                        px: 2,
                        py: 1,
                        fontSize: '0.82rem',
                        fontWeight: file ? 600 : 400,
                        '&:hover': {
                          borderColor: T.accent,
                          bgcolor: T.accentFaint,
                        },
                      }}
                    >
                      <UploadFileIcon sx={{ fontSize: 16, mr: 1 }} />
                      {file ? file.name : 'Choose file…'}
                      <input
                        type="file"
                        hidden
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      />
                    </AccentButton>
                    {file && (
                      <Typography
                        sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.5 }}
                      >
                        {(file.size / 1024).toFixed(1)} KB
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderTop: `1px solid ${T.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexShrink: 0,
                    bgcolor: T.accentFaint,
                  }}
                >
                  <AccentButton
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                    startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
                    sx={{
                      height: 36,
                      bgcolor: T.accent,
                      color: '#fff',
                      boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                      '&:hover': { bgcolor: T.accentDark },
                    }}
                  >
                    {submitting ? 'Uploading…' : 'Upload'}
                  </AccentButton>
                  <AccentButton
                    type="button"
                    variant="outlined"
                    onClick={clearForm}
                    sx={{
                      height: 36,
                      borderColor: T.accentBorder,
                      color: T.muted,
                      '&:hover': {
                        bgcolor: T.accentFaint,
                        borderColor: T.accent,
                        color: T.accent,
                      },
                    }}
                  >
                    Clear
                  </AccentButton>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Documents Panel ── */}
            <Grid item xs={12} lg={8}>
              <SectionCard
                sx={{
                  height: 'calc(100vh - 280px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Toolbar */}
                <Box
                  sx={{
                    px: 3.5,
                    py: 2,
                    borderBottom: `1px solid ${T.divider}`,
                    bgcolor: T.accentFaint,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <Reorder sx={{ fontSize: 17, color: T.accent }} />
                      <Typography
                        sx={{
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: T.text,
                        }}
                      >
                        FILE 201 Documents
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.4,
                          borderRadius: 6,
                          bgcolor: alpha(T.accent, 0.08),
                          border: `1px solid ${alpha(T.accent, 0.15)}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            color: T.accent,
                            fontWeight: 700,
                          }}
                        >
                          {filteredDocs.length} documents
                        </Typography>
                      </Box>
                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v) => v && setViewMode(v)}
                        size="small"
                        sx={{
                          '& .MuiToggleButton-root': {
                            px: 1,
                            py: 0.35,
                            border: `1px solid ${T.accentBorder}`,
                            color: T.muted,
                            '&.Mui-selected': {
                              bgcolor: T.accentFaint,
                              color: T.accent,
                            },
                          },
                        }}
                      >
                        <ToggleButton value="grid">
                          <ViewModuleIcon sx={{ fontSize: 14 }} />
                        </ToggleButton>
                        <ToggleButton value="list">
                          <ViewListIcon sx={{ fontSize: 14 }} />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                  <FieldInput
                    size="small"
                    placeholder="Search by file name, type, or employee…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <SearchIcon
                          sx={{ fontSize: 15, color: T.muted, mr: 0.5 }}
                        />
                      ),
                    }}
                  />
                </Box>

                {/* Document list / grid */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 2,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: T.accentBorder,
                      borderRadius: 2,
                    },
                  }}
                >
                  {paginatedDocs.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          bgcolor: T.accentFaint,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <DescriptionIcon
                          sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: T.muted,
                          mb: 0.5,
                        }}
                      >
                        {documents.length === 0
                          ? 'No documents yet'
                          : 'No documents match your search'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                        {documents.length === 0
                          ? 'Use the form on the left to upload a document.'
                          : 'Try a different search term.'}
                      </Typography>
                    </Box>
                  ) : viewMode === 'grid' ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {paginatedDocs.map((doc) => (
                        <Grid
                          item
                          xs={12}
                          sm={6}
                          md={4}
                          key={doc.id}
                          sx={{ display: 'flex' }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              p: 2,
                              borderRadius: 2,
                              cursor: 'default',
                              bgcolor: '#fff',
                              border: `1px solid ${T.accentBorder}`,
                              transition: 'all 0.13s',
                              '&:hover': {
                                bgcolor: T.rowHover,
                                borderColor: T.accent,
                                transform: 'translateY(-2px)',
                                boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}`,
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: alpha(T.accent, 0.12),
                                  color: T.accent,
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                }}
                              >
                                <DescriptionIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: T.text,
                                    lineHeight: 1.3,
                                  }}
                                  noWrap
                                >
                                  {doc.file_name}
                                </Typography>
                                <Chip
                                  label={doc.file_type}
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.62rem',
                                    bgcolor: T.accentFaint,
                                    color: T.accent,
                                    fontWeight: 600,
                                    mt: 0.4,
                                  }}
                                />
                              </Box>
                            </Box>
                            <Typography
                              sx={{
                                fontSize: '0.7rem',
                                color: T.muted,
                                mb: 0.5,
                              }}
                            >
                              {doc.employee_name || doc.employee_number}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.68rem',
                                color: T.faint,
                                mb: 1,
                              }}
                            >
                              {formatDate(doc.upload_date)}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 0.5,
                                mt: 'auto',
                                flexWrap: 'wrap',
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() => openFilePreview(doc)}
                                sx={{
                                  color: T.accent,
                                  bgcolor: T.accentFaint,
                                  borderRadius: 1,
                                  '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                                }}
                              >
                                <ViewIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => downloadFile(doc)}
                                sx={{
                                  color: T.accent,
                                  bgcolor: T.accentFaint,
                                  borderRadius: 1,
                                  '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                                }}
                              >
                                <DownloadIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(doc)}
                                sx={{
                                  color: T.muted,
                                  bgcolor: T.accentFaint,
                                  borderRadius: 1,
                                  '&:hover': {
                                    bgcolor: alpha(T.accent, 0.15),
                                    color: T.accent,
                                  },
                                }}
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                disabled={deletingId === doc.id}
                                onClick={() => handleDelete(doc)}
                                sx={{
                                  color: '#c62828',
                                  bgcolor: 'rgba(198,40,40,0.06)',
                                  borderRadius: 1,
                                  '&:hover': {
                                    bgcolor: 'rgba(198,40,40,0.12)',
                                  },
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          display: 'grid',
                          gridTemplateColumns: '180px 110px 130px 1fr 100px',
                          gap: 1,
                          alignItems: 'center',
                          bgcolor: alpha(T.accent, 0.04),
                          borderRadius: 1.5,
                          mb: 1,
                        }}
                      >
                        {[
                          'File Name',
                          'Type',
                          'Employee',
                          'Uploaded',
                          'Actions',
                        ].map((col) => (
                          <Typography
                            key={col}
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: T.accent,
                              textTransform: 'uppercase',
                              letterSpacing: '0.07em',
                            }}
                          >
                            {col}
                          </Typography>
                        ))}
                      </Box>
                      {paginatedDocs.map((doc, idx) => (
                        <Box
                          key={doc.id}
                          sx={{
                            px: 1.5,
                            py: 1.25,
                            display: 'grid',
                            gridTemplateColumns: '180px 110px 130px 1fr 100px',
                            gap: 1,
                            alignItems: 'center',
                            borderRadius: 1.5,
                            bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                            border: '1px solid transparent',
                            transition: 'background 0.13s ease',
                            '&:hover': { bgcolor: T.rowHover },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              color: T.text,
                            }}
                            noWrap
                          >
                            {doc.file_name}
                          </Typography>
                          <Chip
                            label={doc.file_type}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor: T.accentFaint,
                              color: T.accent,
                              fontWeight: 600,
                            }}
                          />
                          <Box>
                            <Typography
                              sx={{ fontSize: '0.75rem', color: T.text }}
                              noWrap
                            >
                              {doc.employee_name || '—'}
                            </Typography>
                            <Typography
                              sx={{ fontSize: '0.68rem', color: T.muted }}
                            >
                              #{doc.employee_number}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{ fontSize: '0.72rem', color: T.muted }}
                          >
                            {formatDate(doc.upload_date)}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View">
                              <IconButton
                                size="small"
                                onClick={() => openFilePreview(doc)}
                                sx={{ color: T.accent, p: 0.5 }}
                              >
                                <ViewIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download">
                              <IconButton
                                size="small"
                                onClick={() => downloadFile(doc)}
                                sx={{ color: T.accent, p: 0.5 }}
                              >
                                <DownloadIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(doc)}
                                sx={{
                                  color: T.muted,
                                  p: 0.5,
                                  '&:hover': { color: T.accent },
                                }}
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                disabled={deletingId === doc.id}
                                onClick={() => handleDelete(doc)}
                                sx={{ color: '#c62828', p: 0.5 }}
                              >
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      ))}
                    </>
                  )}
                </Box>

                {filteredDocs.length > 0 && (
                  <Box
                    sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }}
                  >
                    <TablePagination
                      component="div"
                      count={filteredDocs.length}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[12, 24, 48, 96]}
                      sx={{
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                          { fontSize: '0.78rem', fontWeight: 600 },
                      }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* ── Edit Metadata Dialog ── */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <Box
          sx={{
            background: T.headerGrad,
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#fff',
              fontFamily: T.poppins,
            }}
          >
            Edit FILE 201 Metadata
          </Typography>
          <IconButton
            size="small"
            onClick={() => setEditOpen(false)}
            sx={{
              color: 'rgba(255,255,255,0.75)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
            }}
          >
            <Close sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: '20px !important' }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={fieldLabelSx}>File Type</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={editFileType}
                  onChange={(e) => setEditFileType(e.target.value)}
                  sx={{
                    ...selectSx,
                    '& .MuiSelect-select': {
                      fontSize: '0.875rem',
                      py: '8.5px',
                    },
                  }}
                >
                  {FILE_TYPES.map((type) => (
                    <MenuItem
                      key={type}
                      value={type}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography sx={fieldLabelSx}>Remarks</Typography>
              <FieldInput
                multiline
                minRows={3}
                fullWidth
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${T.divider}`,
            bgcolor: T.accentFaint,
          }}
        >
          <AccentButton
            onClick={() => setEditOpen(false)}
            variant="outlined"
            sx={{
              borderColor: T.accentBorder,
              color: T.muted,
              '&:hover': {
                bgcolor: T.accentFaint,
                borderColor: T.accent,
                color: T.accent,
              },
            }}
          >
            Cancel
          </AccentButton>
          <AccentButton
            onClick={handleSaveEdit}
            variant="contained"
            disabled={saving}
            startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              bgcolor: T.accent,
              color: '#fff',
              boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
              '&:hover': { bgcolor: T.accentDark },
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </AccentButton>
        </DialogActions>
      </Dialog>

      {/* ── File Preview Dialog ── */}
      <FilePreviewDialog
        open={Boolean(filePreviewDoc)}
        doc={filePreviewDoc}
        onClose={() => setFilePreviewDoc(null)}
        onDownload={downloadFile}
        isAdminView={isAdminView}
      />

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default File201Admin;
