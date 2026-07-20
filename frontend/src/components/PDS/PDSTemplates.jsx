import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, CircularProgress,
  Alert, Collapse, Card, Button,
  alpha, styled, Fade,
} from '@mui/material';
import UploadFileIcon           from '@mui/icons-material/UploadFile';
import CheckCircleIcon          from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon        from '@mui/icons-material/DeleteOutline';
import DownloadIcon             from '@mui/icons-material/Download';
import VisibilityIcon           from '@mui/icons-material/Visibility';  // NEW
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InsertDriveFileIcon      from '@mui/icons-material/InsertDriveFile';
import FolderSpecialIcon        from '@mui/icons-material/FolderSpecial';
import LibraryBooksIcon         from '@mui/icons-material/LibraryBooks';
import PictureAsPdfIcon         from '@mui/icons-material/PictureAsPdf';
import ArticleIcon              from '@mui/icons-material/Article';
import TableChartIcon           from '@mui/icons-material/TableChart';
import NewReleasesIcon          from '@mui/icons-material/NewReleases';  // NEW — "newest" badge
import AccessDenied             from '../AccessDenied';
import usePageAccess            from '../../hooks/usePageAccess';
import API_BASE_URL             from '../../apiConfig';
import { getAuthHeaders }       from '../../utils/auth';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
  // NEW — for newest-version highlight
  newestBg:     'rgba(21,101,192,0.04)',
  newestBorder: 'rgba(21,101,192,0.55)',
  newestText:   '#1565C0',
};

// ─── Styled primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover':  { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)'   },
});

// ─── Shared panel header bar ──────────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box sx={{
    px: 2.5, py: 1.25,
    borderBottom: `1px solid ${T.divider}`,
    display: 'flex', alignItems: 'center', gap: 1.25,
    bgcolor: T.accentFaint, minHeight: 42,
  }}>
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>
      {title}
    </Typography>
    {right && <><Box sx={{ flex: 1 }} />{right}</>}
  </Box>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

const FileIconComponent = ({ fileName, sx = {} }) => {
  if (!fileName) return <InsertDriveFileIcon sx={{ color: '#888', ...sx }} />;
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf')                return <PictureAsPdfIcon sx={{ color: '#D32F2F', ...sx }} />;
  if (['doc','docx'].includes(ext)) return <ArticleIcon      sx={{ color: '#1565C0', ...sx }} />;
  if (['xls','xlsx'].includes(ext)) return <TableChartIcon   sx={{ color: '#2E7D32', ...sx }} />;
  return <InsertDriveFileIcon sx={{ color: '#888', ...sx }} />;
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '63%', transform: 'translateX(-61%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
            <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={380} h={11} /></Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.1s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: 'rgba(109,35,35,0.06)', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 42 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.2)' }} />
          <Bone w={180} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ border: '2px dashed rgba(109,35,35,0.14)', borderRadius: '8px', p: 4, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.08)' }} />
            <Bone w={220} h={12} /><Bone w={160} h={10} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', height: 40, borderRadius: '8px', bgcolor: 'rgba(109,35,35,0.06)', border: '1px solid rgba(109,35,35,0.14)' }} />
            <Box sx={{ flex: '2 1 280px', height: 40, borderRadius: '8px', bgcolor: 'rgba(109,35,35,0.06)', border: '1px solid rgba(109,35,35,0.14)' }} />
            <Box sx={{ width: 140, height: 40, borderRadius: '8px', bgcolor: 'rgba(109,35,35,0.15)' }} />
          </Box>
        </Box>
      </Box>
      <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.2s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: 'rgba(109,35,35,0.06)', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 42 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.2)' }} />
          <Bone w={160} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent, display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.4fr 0.8fr 1.8fr', gap: 2 }}>
          {[120,60,90,40,100].map((w,i) => (
            <Box key={i} sx={{ height: 10, width: w, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)', justifySelf: i === 4 ? 'end' : 'start' }} />
          ))}
        </Box>
        {[...Array(4)].map((_,i) => (
          <Box key={i} sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.4fr 0.8fr 1.8fr', gap: 2, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd, animation: `blink 2s ease-in-out ${i * 0.08}s infinite` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '6px', bgcolor: T.accentFaint, flexShrink: 0 }} />
              <Box><Bone w={140} h={12} sx={{ mb: 0.75 }} /><Bone w={90} h={9} /></Box>
            </Box>
            <Bone w={55} h={11} /><Bone w={85} h={11} /><Bone w={40} h={11} />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              {[58,72,64,58].map((w,j) => <Box key={j} sx={{ width: w, height: 28, borderRadius: '6px', bgcolor: T.accentFaint }} />)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Native text input ────────────────────────────────────────────────────────
const NativeInput = ({ value, onChange, placeholder, onFocus, onBlur }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%', padding: '9px 13px',
      borderRadius: '8px', border: `1px solid ${T.accentBorder}`,
      fontSize: '0.875rem', outline: 'none',
      fontFamily: 'inherit', boxSizing: 'border-box',
      transition: 'border-color 0.18s', background: '#fff',
      color: T.text,
    }}
    onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; if (onFocus) onFocus(e); }}
    onBlur={e  => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; if (onBlur) onBlur(e); }}
  />
);

// ─── Small row action button ──────────────────────────────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: `1px solid ${color}40`,
      borderRadius: '6px',
      padding: '4px 10px',
      cursor: disabled ? 'default' : 'pointer',
      color,
      display: 'flex', alignItems: 'center', gap: '4px',
      fontSize: '0.72rem', fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'background-color 0.15s, border-color 0.15s',
      whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; }}}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PDSTemplates = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [templates,  setTemplates]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [activating, setActivating] = useState(null);
  const [deleting,   setDeleting]   = useState(null);

  const [dragOver,     setDragOver]     = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [version,      setVersion]      = useState('');
  const [notes,        setNotes]        = useState('');

  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
    setTimeout(() => setAlert(a => ({ ...a, open: false })), 4000);
  };

  const { hasAccess, loading: accessLoading } = usePageAccess('pds-templates');

  // ── Fetch all templates ────────────────────────────────────────────────────
  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/pds-templates`, getAuthHeaders());
      setTemplates(res.data.templates || []);
    } catch {
      showAlert('Failed to load templates.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedRole   = localStorage.getItem('role');
    const storedEmpNum = localStorage.getItem('employeeNumber');
    if (!storedRole || !storedEmpNum) { navigate('/'); return; }
    fetchTemplates();
  }, [navigate]);

  // ── File selection / drop ──────────────────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile)   return showAlert('Please select a file.', 'warning');
    if (!version.trim()) return showAlert('Version label is required.', 'warning');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('version', version.trim());
    formData.append('notes', notes.trim());
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_BASE_URL}/pds-templates/upload`, formData, {
        ...headers,
        headers: { ...headers.headers, 'Content-Type': 'multipart/form-data' },
      });
      showAlert('Template uploaded! Activate it to make it live.');
      setSelectedFile(null); setVersion(''); setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchTemplates();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Activate ───────────────────────────────────────────────────────────────
  const handleActivate = async (id) => {
    setActivating(id);
    try {
      const res = await axios.put(`${API_BASE_URL}/pds-templates/${id}/activate`, {}, getAuthHeaders());
      showAlert(res.data.message);
      fetchTemplates();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Activation failed.', 'error');
    } finally {
      setActivating(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id, fileName) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await axios.delete(`${API_BASE_URL}/pds-templates/${id}`, getAuthHeaders());
      showAlert('Template deleted.');
      fetchTemplates();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Delete failed.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  // FIX: File is fetched from the backend server, not from anyone's local machine
  const handleDownload = async (id, fileName) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/pds-templates/${id}/download`,
        { ...getAuthHeaders(), responseType: 'blob' },
      );
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showAlert('Download failed.', 'error');
    }
  };

  // ── Preview (NEW) ──────────────────────────────────────────────────────────
  // Opens the file in a new browser tab using the inline preview endpoint.
  // PDFs render directly; DOCX/XLSX will prompt download in the new tab.
  const handlePreview = (id) => {
    // We can't pass axios auth headers through window.open, so we build a
    // temporary authenticated blob URL instead.
    axios.get(
      `${API_BASE_URL}/pds-templates/${id}/preview`,
      { ...getAuthHeaders(), responseType: 'blob' },
    ).then(res => {
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      window.open(blobUrl, '_blank');
      // Clean up blob URL after the tab has loaded (5 s grace period)
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
    }).catch(() => {
      showAlert('Preview failed. Try downloading instead.', 'error');
    });
  };

  // ── Access guards ──────────────────────────────────────────────────────────
  if (accessLoading) return <Wireframe />;
  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access PDS Template Manager."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  const canUpload = !uploading && !!selectedFile;

  // ── Newest-version logic ───────────────────────────────────────────────────
  // The newest INACTIVE template gets a blue "NEW" badge so admins can
  // immediately spot which version was just uploaded without reading notes.
  const newestInactiveId = templates.find(t => !t.is_active)?.id ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>
        <style>{shimmerKf}</style>

        {/* ── Page header ───────────────────────────────────────────────── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <FolderSpecialIcon sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  PDS Template Version Control
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>
                  Administrative Panel · Upload, version, and activate Personal Data Sheet templates
                </Typography>
              </Box>
            </Box>

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{
                px: 2, py: 0.6, borderRadius: 5,
                bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}`,
              }}>
                <Typography sx={{ fontSize: '0.75rem', color: T.accent, fontWeight: 700 }}>
                  {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Alerts ────────────────────────────────────────────────────── */}
        <Collapse in={alert.open}>
          <Alert
            severity={alert.severity}
            onClose={() => setAlert(a => ({ ...a, open: false }))}
            sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}
          >
            {alert.message}
          </Alert>
        </Collapse>

        {/* ── Upload card ───────────────────────────────────────────────── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={UploadFileIcon} title="Upload New Template" />
          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>

            {/* Drop zone */}
            <Box
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: `2px dashed ${dragOver ? T.accent : selectedFile ? '#2E7D32' : T.accentBorder}`,
                borderRadius: 2, p: 3, mb: 2,
                textAlign: 'center', cursor: 'pointer',
                bgcolor: dragOver
                  ? T.accentFaint
                  : selectedFile ? 'rgba(46,125,50,0.04)' : '#fafafa',
                transition: 'all 0.18s ease',
                '&:hover': { borderColor: T.accent, bgcolor: T.accentFaint },
              }}
            >
              <input
                type="file" ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {selectedFile ? (
                <Box>
                  <FileIconComponent fileName={selectedFile.name} sx={{ fontSize: 40, mb: 0.75 }} />
                  <Typography sx={{ fontWeight: 700, color: '#2E7D32', fontSize: '0.9rem', mt: 0.5 }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography sx={{ color: T.faint, fontSize: '0.75rem', mt: 0.25 }}>
                    {formatBytes(selectedFile.size)} · Click to change file
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <UploadFileIcon sx={{ fontSize: 40, color: T.accentBorder, mb: 0.75 }} />
                  <Typography sx={{ color: T.muted, fontWeight: 600, fontSize: '0.875rem' }}>
                    Drag &amp; drop a file here, or click to browse
                  </Typography>
                  <Typography sx={{ color: T.faint, fontSize: '0.75rem', mt: 0.25 }}>
                    PDF, DOCX, XLSX, or any format · max 50 MB
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Inputs row */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Box sx={{ flex: '1 1 180px' }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Version Label <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                </Typography>
                <NativeInput
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  placeholder="e.g. Revised 2025"
                />
              </Box>
              <Box sx={{ flex: '2 1 260px' }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Notes / Changelog
                </Typography>
                <NativeInput
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Added item 40c for solo parents"
                />
              </Box>
              <Box sx={{ flex: '0 0 auto', pb: '1px' }}>
                <AccentButton
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!canUpload}
                  startIcon={uploading
                    ? <CircularProgress size={13} sx={{ color: '#fff' }} />
                    : <UploadFileIcon sx={{ fontSize: '15px !important' }} />}
                  sx={{
                    height: 40,
                    bgcolor:   canUpload ? T.accent : '#d8d8d8',
                    color:     canUpload ? '#fff'   : '#999',
                    boxShadow: canUpload ? `0 2px 10px ${alpha(T.accent, 0.28)}` : 'none',
                    '&:hover': { bgcolor: canUpload ? T.accentDark : '#d8d8d8' },
                    '&:disabled': { bgcolor: '#d8d8d8 !important', color: '#999 !important', boxShadow: 'none !important', transform: 'none !important' },
                  }}
                >
                  {uploading ? 'Uploading…' : 'Upload Template'}
                </AccentButton>
              </Box>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Template library ──────────────────────────────────────────── */}
        <SectionCard>
          <PanelHeader
            icon={LibraryBooksIcon}
            title="Template Library"
            right={
              <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                {templates.length} {templates.length === 1 ? 'record' : 'records'}
              </Typography>
            }
          />

          {/* Column headers — added Preview column width to ACTIONS */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1fr 1.4fr 0.8fr 1.8fr',
            px: 2.5, py: 1.25,
            bgcolor: T.accent,
            gap: 2,
          }}>
            {['FILE', 'VERSION', 'UPLOADED', 'SIZE', 'ACTIONS'].map(col => (
              <Typography key={col} sx={{
                color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.08em', textAlign: col === 'ACTIONS' ? 'right' : 'left',
              }}>
                {col}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          {loading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ color: T.accent }} />
              <Typography sx={{ color: T.muted, mt: 1.5, fontSize: '0.82rem' }}>Loading templates…</Typography>
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                <InsertDriveFileIcon sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }} />
              </Box>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: T.muted, mb: 0.4 }}>No templates yet</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>Upload your first PDS template above.</Typography>
            </Box>
          ) : (
            templates.map((tpl, idx) => {
              const isNewest = tpl.id === newestInactiveId;
              return (
                <Box
                  key={tpl.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1fr 1.4fr 0.8fr 1.8fr',
                    px: 2.5, py: 1.75, gap: 2,
                    alignItems: 'center',
                    // Active = maroon tint | Newest inactive = blue tint | else alternate
                    bgcolor: tpl.is_active
                      ? alpha(T.accent, 0.04)
                      : isNewest
                        ? T.newestBg
                        : idx % 2 === 0 ? '#fff' : T.rowOdd,
                    borderBottom: `1px solid ${T.divider}`,
                    borderLeft: tpl.is_active
                      ? `3px solid ${T.accent}`
                      : isNewest
                        ? `3px solid ${T.newestBorder}`
                        : '3px solid transparent',
                    transition: 'background 0.13s',
                    '&:hover': { bgcolor: T.rowHover },
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  {/* File info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box sx={{
                      width: 34, height: 34, borderRadius: '6px', flexShrink: 0,
                      bgcolor: tpl.is_active ? T.accentFaint : isNewest ? 'rgba(21,101,192,0.07)' : '#f5f5f5',
                      border: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileIconComponent fileName={tpl.file_name} sx={{ fontSize: 18 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography sx={{
                          fontWeight: 600, fontSize: '0.82rem', color: T.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
                        }}>
                          {tpl.file_name}
                        </Typography>

                        {/* ACTIVE badge */}
                        {tpl.is_active && (
                          <Box sx={{
                            bgcolor: T.accent, color: '#fff',
                            fontSize: '0.6rem', fontWeight: 800,
                            px: 0.75, py: 0.2, borderRadius: '3px',
                            letterSpacing: '0.05em', flexShrink: 0,
                          }}>
                            ACTIVE
                          </Box>
                        )}

                        {/* NEW badge — shown on the most recently uploaded inactive template */}
                        {isNewest && (
                          <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.35,
                            bgcolor: T.newestBg,
                            color: T.newestText,
                            border: `1px solid ${T.newestBorder}`,
                            fontSize: '0.58rem', fontWeight: 800,
                            px: 0.75, py: 0.2, borderRadius: '3px',
                            letterSpacing: '0.05em', flexShrink: 0,
                          }}>
                            <NewReleasesIcon sx={{ fontSize: 10 }} />
                            NEWEST
                          </Box>
                        )}
                      </Box>

                      {tpl.notes && (
                        <Typography sx={{ color: T.muted, fontSize: '0.7rem', mt: 0.2 }} noWrap>
                          {tpl.notes}
                        </Typography>
                      )}
                      {tpl.uploaded_by_name && (
                        <Typography sx={{ color: T.faint, fontSize: '0.68rem' }}>
                          by {tpl.uploaded_by_name}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Version */}
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: tpl.is_active ? T.accent : isNewest ? T.newestText : T.muted }}>
                    {tpl.version}
                  </Typography>

                  {/* Upload date */}
                  <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>{formatDate(tpl.uploaded_at)}</Typography>

                  {/* File size */}
                  <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>{formatBytes(tpl.file_size)}</Typography>

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', flexWrap: 'wrap' }}>

                    {/* Preview — NEW: opens file inline in new tab */}
                    <RowBtn
                      icon={<VisibilityIcon sx={{ fontSize: 13 }} />}
                      label="Preview | Download"
                      color="#6A1B9A"
                      hoverBg="rgba(106,27,154,0.08)"
                      onClick={() => handlePreview(tpl.id)}
                    />

                    {/* Activate / Active indicator */}
                    {!tpl.is_active ? (
                      <RowBtn
                        icon={activating === tpl.id
                          ? <CircularProgress size={11} sx={{ color: T.accent }} />
                          : <RadioButtonUncheckedIcon sx={{ fontSize: 13 }} />}
                        label="Activate"
                        color={T.accent}
                        hoverBg={T.accentFaint}
                        onClick={() => handleActivate(tpl.id)}
                        disabled={activating === tpl.id}
                      />
                    ) : (
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        px: 1.25, py: 0.5,
                        border: '1px solid rgba(46,125,50,0.3)',
                        borderRadius: '6px', color: '#2E7D32',
                        fontSize: '0.72rem', fontWeight: 700,
                      }}>
                        <CheckCircleIcon sx={{ fontSize: 13 }} />
                        Active
                      </Box>
                    )}

                    {/* Delete — only for inactive templates */}
                    {!tpl.is_active && (
                      <RowBtn
                        icon={deleting === tpl.id
                          ? <CircularProgress size={11} sx={{ color: '#C62828' }} />
                          : <DeleteOutlineIcon sx={{ fontSize: 13 }} />}
                        label="Delete"
                        color="#C62828"
                        hoverBg="rgba(198,40,40,0.08)"
                        onClick={() => handleDelete(tpl.id, tpl.file_name)}
                        disabled={deleting === tpl.id}
                      />
                    )}
                  </Box>
                </Box>
              );
            })
          )}

          {/* Legend */}
          {templates.length > 0 && (
            <Box sx={{
              px: 2.5, py: 1.75,
              borderTop: `1px solid ${T.divider}`,
              bgcolor: T.accentFaint,
              display: 'flex', gap: 2.5, flexWrap: 'wrap',
            }}>
              {[
                { icon: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: T.accent }} />,            label: 'Active template' },
                { icon: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: T.newestText }} />,         label: 'Newest upload' },
                { icon: <VisibilityIcon sx={{ fontSize: 13, color: '#6A1B9A' }} />,                               label: 'Preview in browser' },
                { icon: <RadioButtonUncheckedIcon sx={{ fontSize: 13, color: T.accent }} />,                      label: 'Activate this version' },
                { icon: <DownloadIcon sx={{ fontSize: 13, color: '#1565C0' }} />,                                 label: 'Download file' },
                { icon: <DeleteOutlineIcon sx={{ fontSize: 13, color: '#C62828' }} />,                            label: 'Delete (inactive only)' },
              ].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  {item.icon}
                  <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </SectionCard>

      </Box>
    </Fade>
  );
};

export default PDSTemplates;