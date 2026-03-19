import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, CircularProgress,
  Alert, Avatar, Collapse,
  Card, CardContent,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import API_BASE_URL from '../../apiConfig';
import { getAuthHeaders } from '../../utils/auth';

// ─── Constants ────────────────────────────────────────────────────────────────
const RED       = '#6D2323';
const RED_DARK  = '#4A1717';
const RED_LIGHT = '#F5DCDC';

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

// Returns an MUI icon component (no emoji)
const FileIconComponent = ({ fileName, sx = {} }) => {
  if (!fileName) return <InsertDriveFileIcon sx={{ color: '#888', ...sx }} />;
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf')                return <PictureAsPdfIcon    sx={{ color: '#D32F2F', ...sx }} />;
  if (['doc', 'docx'].includes(ext)) return <ArticleIcon        sx={{ color: '#1565C0', ...sx }} />;
  if (['xls', 'xlsx'].includes(ext)) return <TableChartIcon     sx={{ color: '#2E7D32', ...sx }} />;
  return <InsertDriveFileIcon sx={{ color: '#888', ...sx }} />;
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const laShimmerKeyframes = `
@keyframes laShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes laPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`;

const LASkeletonBox = ({ width = '100%', height = 16, borderRadius = 8, sx = {} }) => (
  <Box
    sx={{
      width, height,
      borderRadius: `${borderRadius}px`,
      background: 'linear-gradient(90deg,rgba(109,35,35,0.08) 25%,rgba(109,35,35,0.18) 50%,rgba(109,35,35,0.08) 75%)',
      backgroundSize: '800px 100%',
      animation: 'laShimmer 1.5s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Wireframe ────────────────────────────────────────────────────────────────
const PDSTemplatesWireframe = () => (
  <>
    <style>{laShimmerKeyframes}</style>
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* Hero skeleton */}
      <Box sx={{ mb: 4, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(109,35,35,0.1)', animation: 'laPulse 2s ease-in-out infinite' }}>
        <Box sx={{ p: 5, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.04)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', mr: 4, flexShrink: 0 }} />
            <Box>
              <LASkeletonBox width={320} height={28} borderRadius={6} sx={{ mb: 1.5 }} />
              <LASkeletonBox width={420} height={14} borderRadius={4} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Upload card skeleton */}
      <Box sx={{ mb: 4, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(109,35,35,0.1)', animation: 'laPulse 2s ease-in-out 0.08s infinite', bgcolor: '#fff' }}>
        <Box sx={{ p: 4, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)', flexShrink: 0 }} />
          <Box>
            <LASkeletonBox width={220} height={16} borderRadius={4} sx={{ mb: 0.75 }} />
            <LASkeletonBox width={310} height={11} borderRadius={3} />
          </Box>
        </Box>
        <Box sx={{ p: 4 }}>
          <Box sx={{ border: '2px dashed rgba(109,35,35,0.18)', borderRadius: '8px', p: 4, textAlign: 'center', mb: 3, bgcolor: '#FAFAFA' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.08)', mx: 'auto', mb: 2 }} />
            <LASkeletonBox width={260} height={14} borderRadius={4} sx={{ mx: 'auto', mb: 1 }} />
            <LASkeletonBox width={190} height={11} borderRadius={3} sx={{ mx: 'auto' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Box sx={{ flex: '1 1 220px' }}>
              <LASkeletonBox width={110} height={10} borderRadius={3} sx={{ mb: 1 }} />
              <Box sx={{ height: 44, borderRadius: '8px', border: '1.5px solid #DDD', bgcolor: '#FAFAFA' }} />
            </Box>
            <Box sx={{ flex: '2 1 300px' }}>
              <LASkeletonBox width={150} height={10} borderRadius={3} sx={{ mb: 1 }} />
              <Box sx={{ height: 44, borderRadius: '8px', border: '1.5px solid #DDD', bgcolor: '#FAFAFA' }} />
            </Box>
            <Box sx={{ flex: '0 0 auto' }}>
              <Box sx={{ width: 148, height: 44, borderRadius: '8px', bgcolor: 'rgba(109,35,35,0.15)' }} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Table card skeleton */}
      <Box sx={{ mb: 4, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(109,35,35,0.1)', animation: 'laPulse 2s ease-in-out 0.16s infinite', bgcolor: '#fff' }}>
        <Box sx={{ p: 4, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box>
              <LASkeletonBox width={200} height={16} borderRadius={4} sx={{ mb: 0.75 }} />
              <LASkeletonBox width={160} height={11} borderRadius={3} />
            </Box>
          </Box>
        </Box>
        {/* Column bar */}
        <Box sx={{ bgcolor: RED, px: 3, py: 1.5, display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1fr 1.8fr', alignItems: 'center' }}>
          {[180, 80, 110, 55, 160].map((w, i) => (
            <Box key={i} sx={{ height: 12, width: w, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)', justifySelf: i === 4 ? 'flex-end' : 'flex-start' }} />
          ))}
        </Box>
        {/* Row skeletons */}
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1fr 1.8fr',
              px: 3, py: 2.5,
              alignItems: 'center',
              borderBottom: '1px solid #F0F0F0',
              bgcolor: i % 2 === 0 ? '#fff' : '#FAFAFA',
              animation: `laPulse 2s ease-in-out ${i * 0.07}s infinite`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: 'rgba(109,35,35,0.1)', flexShrink: 0 }} />
              <Box>
                <LASkeletonBox width={170} height={13} borderRadius={3} sx={{ mb: 0.6 }} />
                <LASkeletonBox width={105} height={10} borderRadius={3} />
              </Box>
            </Box>
            <LASkeletonBox width={65} height={12} borderRadius={3} />
            <LASkeletonBox width={100} height={12} borderRadius={3} />
            <LASkeletonBox width={52} height={12} borderRadius={3} />
            {/* Action buttons skeleton */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              {[88, 80, 72].map((w, j) => (
                <Box key={j} sx={{ width: w, height: 30, borderRadius: '6px', bgcolor: 'rgba(109,35,35,0.07)' }} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── GlassCard ────────────────────────────────────────────────────────────────
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: 3,
      border: '1px solid rgba(109, 35, 35, 0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      overflow: 'visible',
      '&:hover': { boxShadow: '0 12px 40px rgba(109, 35, 35, 0.12)' },
      ...sx,
    }}
  >
    {children}
  </Card>
);

// ─── Labeled action button ────────────────────────────────────────────────────
const ActionBtn = ({ icon, label, onClick, color, hoverBg, disabled = false, title }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: `1px solid ${color}40`,
      borderRadius: '6px',
      padding: '5px 10px',
      cursor: disabled ? 'default' : 'pointer',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '0.75rem',
      fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'background-color 0.15s, border-color 0.15s',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}
    {label}
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

  const [inlineAlert, setInlineAlert] = useState({ open: false, message: '', severity: 'success' });

  const showAlert = (message, severity = 'success') => {
    setInlineAlert({ open: true, message, severity });
    setTimeout(() => setInlineAlert((a) => ({ ...a, open: false })), 4000);
  };

  const { hasAccess, loading: accessLoading } = usePageAccess('pds-templates');

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



  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

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

  const handleDownload = async (id, fileName) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/pds-templates/${id}/download`,
        { ...getAuthHeaders(), responseType: 'blob' }
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

  if (accessLoading) return <PDSTemplatesWireframe />;

  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access PDS Template Manager."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  return (
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >

      {/* ── Hero Header ── */}
      <GlassCard sx={{ mb: 4, overflow: 'hidden', position: 'relative' }}>
        <Box
          sx={{
            p: 5,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
            color: '#6d2323',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)' }} />
          <Box display="flex" alignItems="center" position="relative" zIndex={1}>
            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', mr: 4, width: 64, height: 64, boxShadow: '0 8px 24px rgba(109,35,35,0.15)' }}>
              <FolderSpecialIcon sx={{ color: '#6d2323', fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 900, mb: 1, lineHeight: 1.2, color: '#6d2323' }}>
                PDS Template Manager
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.85, fontWeight: 700, color: '#8B3333' }}>
                Administrative Panel • Upload, version, and activate Personal Data Sheet form templates
              </Typography>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* ── Upload Card ── */}
      <GlassCard sx={{ mb: 4 }}>
        <Box
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
            color: '#6d2323',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <UploadFileIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Upload New Template</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 800 }}>
              Select a file and set a version label to add it to the library
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* Drop Zone */}
          <Box
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: `2px dashed ${dragOver ? RED : selectedFile ? '#2E7D32' : '#CCC'}`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragOver ? RED_LIGHT : selectedFile ? '#F0FAF0' : '#FAFAFA',
              transition: 'all 0.2s ease',
              mb: 3,
              '&:hover': { borderColor: RED, backgroundColor: RED_LIGHT },
            }}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
            {selectedFile ? (
              <Box>
                <FileIconComponent fileName={selectedFile.name} sx={{ fontSize: 48, mb: 1 }} />
                <Typography sx={{ fontWeight: 700, color: '#2E7D32', fontSize: '1rem', mt: 1 }}>
                  {selectedFile.name}
                </Typography>
                <Typography sx={{ color: '#888', fontSize: '0.82rem', mt: 0.5 }}>
                  {formatBytes(selectedFile.size)} — Click to change file
                </Typography>
              </Box>
            ) : (
              <Box>
                <UploadFileIcon sx={{ fontSize: 48, color: '#CCC', mb: 1 }} />
                <Typography sx={{ color: '#555', fontWeight: 600 }}>Drag & drop any file here, or click to browse</Typography>
                <Typography sx={{ color: '#AAA', fontSize: '0.8rem', mt: 0.5 }}>PDF, DOCX, XLSX, or any format — max 50 MB</Typography>
              </Box>
            )}
          </Box>

          {/* Inputs row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Box sx={{ flex: '1 1 220px' }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', mb: 0.5 }}>
                VERSION LABEL <span style={{ color: RED }}>*</span>
              </Typography>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. Revised 2025"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: '1.5px solid #DDD', fontSize: '0.9rem', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = RED}
                onBlur={(e)  => e.target.style.borderColor = '#DDD'}
              />
            </Box>
            <Box sx={{ flex: '2 1 300px' }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', mb: 0.5 }}>
                NOTES / CHANGELOG
              </Typography>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Added item 40c for solo parents"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: '1.5px solid #DDD', fontSize: '0.9rem', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = RED}
                onBlur={(e)  => e.target.style.borderColor = '#DDD'}
              />
            </Box>
            <Box sx={{ flex: '0 0 auto' }}>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                style={{
                  backgroundColor: uploading || !selectedFile ? '#CCC' : RED,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px 28px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s',
                  fontFamily: 'inherit',
                  height: '44px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { if (!uploading && selectedFile) e.currentTarget.style.backgroundColor = RED_DARK; }}
                onMouseLeave={(e) => { if (!uploading && selectedFile) e.currentTarget.style.backgroundColor = RED; }}
              >
                {uploading
                  ? <><CircularProgress size={16} sx={{ color: '#fff' }} /> Uploading…</>
                  : <><UploadFileIcon sx={{ fontSize: 18 }} /> Upload Template</>
                }
              </button>
            </Box>
          </Box>
        </CardContent>
      </GlassCard>

      {/* ── Inline alert — sits right above the library card ── */}
      <Collapse in={inlineAlert.open}>
        <Alert
          severity={inlineAlert.severity}
          onClose={() => setInlineAlert((a) => ({ ...a, open: false }))}
          sx={{ mb: 2, borderRadius: 2, fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
        >
          {inlineAlert.message}
        </Alert>
      </Collapse>

      {/* ── Template Library Card ── */}
      <GlassCard sx={{ mb: { xs: 6, md: 10 }, overflow: 'visible' }}>

        {/* Card header */}
        <Box
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
            color: '#6d2323',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', width: 56, height: 56 }}>
              <LibraryBooksIcon sx={{ fontSize: 28, color: '#6d2323' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#6d2323' }}>Template Library</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, color: '#8B3333', fontWeight: 800 }}>
                {templates.length} {templates.length === 1 ? 'template' : 'templates'} on record
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Column headers */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1fr 1.8fr',
            backgroundColor: RED,
            px: 3, py: 1.5,
          }}
        >
          {['FILE', 'VERSION', 'UPLOADED', 'SIZE', 'ACTIONS'].map((col) => (
            <Typography key={col} sx={{
              color: '#fff', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
              textAlign: col === 'ACTIONS' ? 'right' : 'left',
            }}>
              {col}
            </Typography>
          ))}
        </Box>

        {/* Rows */}
        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress sx={{ color: RED }} />
            <Typography sx={{ color: '#888', mt: 2, fontSize: '0.9rem' }}>Loading templates…</Typography>
          </Box>
        ) : templates.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <InsertDriveFileIcon sx={{ fontSize: 48, color: '#DDD', mb: 2 }} />
            <Typography sx={{ color: '#AAA', fontWeight: 500 }}>No templates uploaded yet.</Typography>
            <Typography sx={{ color: '#CCC', fontSize: '0.82rem', mt: 0.5 }}>Upload your first PDS template above.</Typography>
          </Box>
        ) : (
          templates.map((tpl, idx) => (
            <Box
              key={tpl.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1fr 1.8fr',
                px: 3, py: 2,
                alignItems: 'center',
                backgroundColor: tpl.is_active ? RED_LIGHT : idx % 2 === 0 ? '#fff' : '#FAFAFA',
                borderBottom: '1px solid #F0F0F0',
                borderLeft: tpl.is_active ? `4px solid ${RED}` : '4px solid transparent',
                transition: 'background-color 0.15s',
                '&:hover': { backgroundColor: tpl.is_active ? RED_LIGHT : '#F7F2F2' },
              }}
            >
              {/* File name */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Avatar sx={{
                  bgcolor: tpl.is_active ? RED_LIGHT : '#F5F5F5',
                  width: 36, height: 36, borderRadius: '8px',
                  flexShrink: 0,
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <FileIconComponent fileName={tpl.file_name} sx={{ fontSize: 20 }} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{
                      fontWeight: 600, fontSize: '0.88rem', color: '#222',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px',
                    }}>
                      {tpl.file_name}
                    </Typography>
                    {tpl.is_active && (
                      <Box sx={{
                        backgroundColor: RED, color: '#fff',
                        fontSize: '0.65rem', fontWeight: 800, px: 1, py: 0.25,
                        borderRadius: '4px', letterSpacing: '0.05em', flexShrink: 0,
                      }}>
                        ACTIVE
                      </Box>
                    )}
                  </Box>
                  {tpl.notes && (
                    <Typography sx={{ color: '#888', fontSize: '0.75rem', mt: 0.3 }} noWrap>{tpl.notes}</Typography>
                  )}
                  {tpl.uploaded_by_name && (
                    <Typography sx={{ color: '#AAA', fontSize: '0.72rem' }}>by {tpl.uploaded_by_name}</Typography>
                  )}
                </Box>
              </Box>

              {/* Version */}
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 600, color: tpl.is_active ? RED : '#444' }}>
                {tpl.version}
              </Typography>

              {/* Date */}
              <Typography sx={{ fontSize: '0.78rem', color: '#666' }}>{formatDate(tpl.uploaded_at)}</Typography>

              {/* Size */}
              <Typography sx={{ fontSize: '0.78rem', color: '#888' }}>{formatBytes(tpl.file_size)}</Typography>

              {/* Actions — labeled buttons */}
              <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {/* Download */}
                <ActionBtn
                  icon={<DownloadIcon sx={{ fontSize: 15 }} />}
                  label="Download"
                  color="#1565C0"
                  hoverBg="rgba(21,101,192,0.08)"
                  onClick={() => handleDownload(tpl.id, tpl.file_name)}
                  title="Download this template"
                />

                {/* Activate / Active */}
                {!tpl.is_active ? (
                  <ActionBtn
                    icon={activating === tpl.id
                      ? <CircularProgress size={13} sx={{ color: RED }} />
                      : <RadioButtonUncheckedIcon sx={{ fontSize: 15 }} />
                    }
                    label="Activate"
                    color={RED}
                    hoverBg={RED_LIGHT}
                    onClick={() => handleActivate(tpl.id)}
                    disabled={activating === tpl.id}
                    title="Set as active template"
                  />
                ) : (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    px: 1.25, py: 0.625,
                    border: '1px solid rgba(46,125,50,0.35)',
                    borderRadius: '6px',
                    color: '#2E7D32',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    <CheckCircleIcon sx={{ fontSize: 15 }} />
                    Active
                  </Box>
                )}

                {/* Delete (inactive only) */}
                {!tpl.is_active && (
                  <ActionBtn
                    icon={deleting === tpl.id
                      ? <CircularProgress size={13} sx={{ color: '#C62828' }} />
                      : <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                    }
                    label="Delete"
                    color="#C62828"
                    hoverBg="rgba(198,40,40,0.08)"
                    onClick={() => handleDelete(tpl.id, tpl.file_name)}
                    disabled={deleting === tpl.id}
                    title="Delete this template"
                  />
                )}
              </Box>
            </Box>
          ))
        )}

        {/* Legend */}
        <Box sx={{ mt: 2, display: 'flex', gap: 3, px: 3, pb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: RED }} />
            <Typography sx={{ fontSize: '0.78rem', color: '#888' }}>Active template</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: RED }} />
            <Typography sx={{ fontSize: '0.78rem', color: '#888' }}>Activate this version</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <DownloadIcon sx={{ fontSize: 14, color: '#1565C0' }} />
            <Typography sx={{ fontSize: '0.78rem', color: '#888' }}>Download file</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <DeleteOutlineIcon sx={{ fontSize: 14, color: '#C62828' }} />
            <Typography sx={{ fontSize: '0.78rem', color: '#888' }}>Delete (inactive only)</Typography>
          </Box>
        </Box>
      </GlassCard>

    </Box>
  );
};

export default PDSTemplates;