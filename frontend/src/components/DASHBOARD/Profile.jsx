import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import useProfileData from '../../hooks/useProfileData';
import useProfileSections from '../../hooks/useProfileSections';
import useProfileMutations from '../../hooks/useProfileMutations';
import { getUserInfo, getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import {
  Avatar, Typography, Box, Grid, Button, Modal, TextField,
  Chip, IconButton, Tooltip, alpha, Backdrop, InputAdornment,
  FormControl, Select, MenuItem as MuiMenuItem, LinearProgress,
} from '@mui/material';
import PersonIcon            from '@mui/icons-material/Person';
import CloseIcon             from '@mui/icons-material/Close';
import BadgeIcon             from '@mui/icons-material/Badge';
import HomeIcon              from '@mui/icons-material/Home';
import CallIcon              from '@mui/icons-material/Call';
import GroupIcon             from '@mui/icons-material/Group';
import SchoolIcon            from '@mui/icons-material/School';
import EditIcon              from '@mui/icons-material/Edit';
import SaveIcon              from '@mui/icons-material/Save';
import DeleteIcon            from '@mui/icons-material/Delete';
import EmailIcon             from '@mui/icons-material/Email';
import WorkIcon              from '@mui/icons-material/Work';
import CloudUploadIcon       from '@mui/icons-material/CloudUpload';
import RefreshIcon           from '@mui/icons-material/Refresh';
import DownloadIcon          from '@mui/icons-material/Download';
import ShareIcon             from '@mui/icons-material/Share';
import ChildCareIcon         from '@mui/icons-material/ChildCare';
import AddIcon               from '@mui/icons-material/Add';
import FactCheckIcon         from '@mui/icons-material/FactCheck';
import PercentIcon           from '@mui/icons-material/Percent';
import PsychologyIcon        from '@mui/icons-material/Psychology';
import BookIcon              from '@mui/icons-material/Book';
import InfoIcon              from '@mui/icons-material/Info';
import ConstructionIcon      from '@mui/icons-material/Construction';
import ArrowBackIosIcon      from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon   from '@mui/icons-material/ArrowForwardIos';
import CameraAltIcon         from '@mui/icons-material/CameraAlt';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import AccountCircleIcon     from '@mui/icons-material/AccountCircle';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PhotoSizeSelectActualIcon from '@mui/icons-material/PhotoSizeSelectActual';
import CropOriginalIcon      from '@mui/icons-material/CropOriginal';
import SchoolRoundedIcon     from '@mui/icons-material/SchoolRounded';
import VerifiedUserIcon      from '@mui/icons-material/VerifiedUser';
import FingerprintIcon       from '@mui/icons-material/Fingerprint';
import AssignmentIndIcon     from '@mui/icons-material/AssignmentInd';
import LockIcon              from '@mui/icons-material/Lock';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(109,35,35,0.4); }
    70%  { box-shadow: 0 0 0 8px rgba(109,35,35,0); }
    100% { box-shadow: 0 0 0 0 rgba(109,35,35,0); }
  }
  @keyframes shimmer {
    0%   { background-position: -900px 0; }
    100% { background-position:  900px 0; }
  }
  @keyframes wfPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @keyframes sectionIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bannerSlide {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  * { font-family: 'IBM Plex Sans', sans-serif; box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #f0f0f0; }
  ::-webkit-scrollbar-thumb { background: rgba(109,35,35,0.25); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(109,35,35,0.5); }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────────────────────── */
const P         = '#6D2323';
const S         = '#8B4545';
const P_DARK    = '#4a1515';
const PAGE_BG   = 'transparent';
const PANEL     = '#ffffff';
const BD        = '#e2e4e8';
const TXT       = '#111827';
const MUTED     = '#6b7280';
const SUBTLE    = '#f7f8fa';
const SIDEBAR_W = 280;

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON ATOM
───────────────────────────────────────────────────────────────────────────── */
const SK = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: `${r}px`, flexShrink: 0,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.06) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.06) 75%)',
    backgroundSize: '900px 100%',
    animation: 'shimmer 1.7s infinite linear',
    ...sx,
  }} />
);

/* ─────────────────────────────────────────────────────────────────────────────
   PROFILE WIREFRAME
───────────────────────────────────────────────────────────────────────────── */
const ProfileWireframe = () => {
  const mainSx = {
    width: '100vw', maxWidth: '100%', position: 'relative',
    left: '63%', transform: 'translateX(-61%)', boxSizing: 'border-box',
    pl: { xs: 2, sm: 3, md: 6 },
    pr: `${SIDEBAR_W + 16}px`,
    py: { xs: 2, md: 4 },
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    '&::-webkit-scrollbar': { width: 5 },
    '&::-webkit-scrollbar-track': { background: '#f0f0f0' },
    '&::-webkit-scrollbar-thumb': { background: alpha(P, 0.2), borderRadius: 4 },
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden', bgcolor: PAGE_BG }}>
      <style>{GLOBAL_CSS}</style>
      <Box sx={{
        width: SIDEBAR_W, bgcolor: PANEL,
        borderLeft: `2px solid ${alpha(P, 0.25)}`,
        position: 'fixed', right: 0, top: 0, height: '100vh',
        zIndex: 100, display: 'flex', flexDirection: 'column',
        animation: 'wfPulse 2.2s ease-in-out infinite',
      }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha(P, 0.1)}`, display: 'flex', alignItems: 'center', gap: 2, background: `linear-gradient(135deg,${alpha(P, 0.06)} 0%,${alpha(P, 0.01)} 100%)` }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(P, 0.15), flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <SK w="58%" h={11} r={4} sx={{ mb: 0.75 }} />
            <SK w="40%" h={8}  r={3} />
          </Box>
        </Box>
        <Box sx={{ mx: 2.5, my: 2, p: 2, bgcolor: alpha(P, 0.04), borderRadius: 2, border: `1px solid ${alpha(P, 0.1)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: alpha(P, 0.13), flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <SK w="68%" h={11} r={4} sx={{ mb: 0.6 }} />
              <SK w="46%" h={8}  r={3} />
            </Box>
          </Box>
        </Box>
        <Box sx={{ mx: 2.5, mb: 2, p: 1.75, bgcolor: alpha(P, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(P, 0.15)}` }}>
          <SK w="42%" h={8}  r={3} sx={{ mb: 0.6 }} />
          <SK w="72%" h={12} r={4} />
        </Box>
        <Box sx={{ px: 3, mb: 0.75 }}><SK w="55%" h={8} r={3} /></Box>
        {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, px: 3, py: 1.3, borderLeft: i === 0 ? `3px solid ${alpha(P, 0.5)}` : '3px solid transparent', bgcolor: i === 0 ? alpha(P, 0.06) : 'transparent' }}>
            <Box sx={{ width: 15, height: 15, borderRadius: '50%', bgcolor: alpha(P, i === 0 ? 0.22 : 0.07), flexShrink: 0 }} />
            <SK w={`${44 + i * 4}%`} h={10} r={3} />
          </Box>
        ))}
      </Box>
      <Box sx={mainSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <SK w={60}  h={9} r={3} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: BD }} />
          <SK w={140} h={9} r={3} />
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {[0, 1].map(i => <Box key={i} sx={{ width: 30, height: 30, borderRadius: 1.5, border: `1px solid ${BD}`, bgcolor: SUBTLE }} />)}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, bgcolor: PANEL, border: `1px solid ${BD}`, borderRadius: '20px' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: alpha('#22c55e', 0.5) }} />
            <SK w={140} h={8} r={3} />
          </Box>
        </Box>
        <Box sx={{ mb: 3.5, borderRadius: 3, overflow: 'hidden', border: `1px solid ${alpha(P, 0.09)}`, bgcolor: PANEL, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Box sx={{ height: 8, background: `linear-gradient(90deg, ${P} 0%, ${S} 100%)` }} />
          <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 3, md: 4 }, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Box sx={{ width: 90, height: 90, borderRadius: '50%', bgcolor: alpha(P, 0.1), border: `4px solid ${PANEL}`, boxShadow: `0 4px 16px ${alpha(P, 0.18)}` }} />
              <Box sx={{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: '50%', bgcolor: alpha(P, 0.18) }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <SK w="55%" h={26} r={5} sx={{ mb: 1.2 }} />
              <SK w="38%" h={10} r={3} sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[80, 100, 72].map((w, i) => <Box key={i} sx={{ width: w, height: 22, borderRadius: '20px', bgcolor: alpha(P, 0.07), border: `1px solid ${alpha(P, 0.12)}` }} />)}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, border: `1px solid ${BD}`, bgcolor: SUBTLE }} />
              <Box sx={{ width: 130, height: 36, borderRadius: 1.5, bgcolor: alpha(P, 0.18) }} />
            </Box>
          </Box>
          <Box sx={{ borderTop: `1px solid ${BD}`, px: 5, py: 2, display: 'flex', gap: 4, bgcolor: alpha(P, 0.015) }}>
            {[0, 1, 2, 3].map(i => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(P, 0.08) }} />
                <Box>
                  <SK w={60} h={16} r={4} sx={{ mb: 0.4 }} />
                  <SK w={80} h={8}  r={3} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ borderRadius: 3, border: `1px solid ${alpha(P, 0.09)}`, bgcolor: PANEL, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#ffffff 0%,#f5f5f5 100%)', display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${BD}` }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: alpha(P, 0.1) }} />
            <Box>
              <SK w={170} h={14} r={4} sx={{ mb: 0.75 }} />
              <SK w={240} h={9}  r={3} />
            </Box>
          </Box>
          <Box sx={{ p: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '28px' }}>
            {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
              <Box key={i}>
                <SK w="42%" h={8}  r={3} sx={{ mb: 0.7 }} />
                <Box sx={{ pl: 1.5, borderLeft: `2px solid ${alpha(P, 0.15)}` }}>
                  <SK w={`${55 + (i % 4) * 10}%`} h={13} r={4} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED ATOMS
───────────────────────────────────────────────────────────────────────────── */
const GlassCard = ({ children, sx = {} }) => (
  <Box sx={{
    background: PANEL, borderRadius: 3,
    border: `1px solid ${alpha(P, 0.09)}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    ...sx,
  }}>{children}</Box>
);

const CardBanner = () => (
  <Box sx={{ height: 6, background: `linear-gradient(90deg, ${P} 0%, ${S} 60%, ${alpha(P, 0.4)} 100%)` }} />
);

const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <Box sx={{
    px: 4, py: 3,
    background: 'linear-gradient(135deg,#ffffff 0%,#f6f6f6 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 2, flexWrap: 'wrap',
    borderBottom: `1px solid ${BD}`,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: alpha(P, 0.1), width: 52, height: 52, boxShadow: `0 4px 16px ${alpha(P, 0.12)}` }}>
        <Icon sx={{ color: P, fontSize: 26 }} />
      </Avatar>
      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: P, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: '0.78rem', color: MUTED, fontWeight: 600, mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

const Btn = ({ children, danger, outline, sm, fullWidth, ...p }) => (
  <Button disableElevation fullWidth={fullWidth} variant={outline ? 'outlined' : 'contained'}
    sx={{
      borderRadius: 2, textTransform: 'none', fontWeight: 900,
      fontSize: sm ? '0.78rem' : '0.875rem',
      py: sm ? 0.75 : 1.1, px: sm ? 2 : 3,
      boxShadow: outline ? 'none' : `0 4px 12px ${alpha(P, 0.28)}`,
      ...(outline
        ? { borderColor: alpha(P, 0.45), color: P, '&:hover': { borderColor: P, bgcolor: alpha(P, 0.04) } }
        : danger
          ? { bgcolor: '#b91c1c', color: '#fff', '&:hover': { bgcolor: '#991b1b' }, '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' } }
          : { bgcolor: P, color: '#fff', '&:hover': { bgcolor: P_DARK }, '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' } }),
    }} {...p}>{children}
  </Button>
);

/* ── Field Label — refined, subtle uppercase style ── */
const FL = ({ children, req }) => (
  <Typography component="label" sx={{
    fontSize: '0.68rem', fontWeight: 700, color: alpha(TXT, 0.5),
    mb: 0.55, display: 'flex', alignItems: 'center', gap: 0.4,
    letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
  }}>
    {children}{req && <span style={{ color: '#c0392b', marginLeft: 2, fontSize: '0.62rem' }}>*</span>}
  </Typography>
);

/* ── Shared input chrome
     Surface is white. Inputs use #f4f5f7 so they read as
     recessed/inset — part of the form, not floating cards on top of it. ── */
const INPUT_CHROME = {
  borderRadius: '8px',
  bgcolor: '#f4f5f7',
  fontSize: '0.875rem',
  color: TXT,
  transition: 'background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  '& fieldset': {
    borderColor: 'transparent',
    borderWidth: '1.5px',
    transition: 'border-color 0.15s ease',
  },
  '&:hover': { bgcolor: '#eef0f3' },
  '&:hover fieldset': { borderColor: alpha(P, 0.22) },
  '&.Mui-focused': {
    bgcolor: '#ffffff',
    boxShadow: `0 0 0 2px ${alpha(P, 0.18)}, inset 0 1px 3px rgba(0,0,0,0.04)`,
  },
  '&.Mui-focused fieldset': { borderColor: P, borderWidth: '1.5px' },
  '&.Mui-disabled': {
    bgcolor: '#f0f1f3',
    '& fieldset': { borderColor: 'transparent' },
    '& .MuiInputBase-input': {
      color: '#9ca3af',
      WebkitTextFillColor: '#9ca3af',
      cursor: 'not-allowed',
    },
  },
};

const FX = {
  '& .MuiOutlinedInput-root': INPUT_CHROME,
  '& .MuiInputBase-input': { py: '9px', px: '12px', fontWeight: 500 },
};

const MFX = {
  '& .MuiOutlinedInput-root': {
    ...INPUT_CHROME,
    '& .MuiInputBase-inputMultiline': { fontWeight: 500, lineHeight: 1.65 },
  },
};

/* ── Select chrome — matches INPUT_CHROME exactly ── */
const SELECT_SX = {
  borderRadius: '8px',
  bgcolor: '#f4f5f7',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent', borderWidth: '1.5px' },
  '&:hover': { bgcolor: '#eef0f3' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(P, 0.22) },
  '&.Mui-focused': {
    bgcolor: '#ffffff',
    boxShadow: `0 0 0 2px ${alpha(P, 0.18)}, inset 0 1px 3px rgba(0,0,0,0.04)`,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: P, borderWidth: '1.5px' },
  '& .MuiSelect-select': { py: '9px', px: '12px' },
};

/* ── Info group — institutional style ── */
const InfoGroup = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, fontWeight: 700, mb: 0.55 }}>{label}</Typography>
    <Box sx={{ pl: 1.5, borderLeft: `2px solid ${alpha(P, 0.22)}` }}>
      <Typography sx={{ fontSize: '0.88rem', color: TXT, fontWeight: 600, lineHeight: 1.5 }}>{value || '—'}</Typography>
    </Box>
  </Box>
);

const InfoGrid = ({ children, sx = {} }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '26px', ...sx }}>{children}</Box>
);

const Div = ({ label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
    <Box sx={{ width: 24, height: 3, bgcolor: P, borderRadius: 2, mr: 1.5, flexShrink: 0 }} />
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '0.14em', mr: 1.5 }}>{label}</Typography>
    <Box sx={{ flex: 1, height: '1px', bgcolor: alpha(P, 0.12) }} />
  </Box>
);

const TLWrap = ({ children }) => (
  <Box sx={{ position: 'relative', pl: '22px', '&::before': { content: '""', position: 'absolute', left: 0, top: '8px', bottom: 0, width: '2px', bgcolor: alpha(P, 0.15) } }}>{children}</Box>
);
const TLItem = ({ date, title, sub, tags = [], last }) => (
  <Box sx={{ position: 'relative', pb: last ? 0 : '28px', '&::before': { content: '""', position: 'absolute', left: '-27px', top: '7px', width: '10px', height: '10px', bgcolor: P, border: `2px solid ${PANEL}`, borderRadius: '50%', zIndex: 1, boxShadow: `0 0 0 3px ${alpha(P, 0.15)}` } }}>
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: P, fontWeight: 700, mb: 0.3 }}>{date}</Typography>
    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: TXT, mb: '2px', lineHeight: 1.4 }}>{title || '—'}</Typography>
    <Typography sx={{ fontSize: '0.82rem', color: MUTED, mb: tags.length ? 1 : 0 }}>{sub || '—'}</Typography>
    {tags.length > 0 && (
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {tags.map((t, i) => <Box key={i} sx={{ px: 1.25, py: 0.2, bgcolor: alpha(P, 0.07), border: `1px solid ${alpha(P, 0.18)}`, borderRadius: '20px' }}><Typography sx={{ fontSize: '0.62rem', fontWeight: 900, color: P }}>{t}</Typography></Box>)}
      </Box>
    )}
  </Box>
);

const ListCard = ({ children }) => (
  <Box sx={{ border: `1px solid ${alpha(P, 0.12)}`, borderRadius: 2, mb: 1.5, bgcolor: SUBTLE, overflow: 'hidden', transition: 'all 0.2s', '&:hover': { borderColor: P, boxShadow: `0 4px 16px ${alpha(P, 0.1)}`, transform: 'translateY(-1px)' } }}>
    <Box sx={{ height: 3, background: `linear-gradient(90deg, ${P} 0%, ${alpha(P, 0.3)} 100%)` }} />
    <Box sx={{ p: 2.5 }}>{children}</Box>
  </Box>
);

const GovIdNotice = () => (
  <Box sx={{
    mb: 3,
    borderRadius: '10px',
    overflow: 'hidden',
    border: `1px solid ${alpha(P, 0.25)}`,
    bgcolor: alpha(P, 0.03),
    boxShadow: `0 1px 4px ${alpha(P, 0.06)}`,
  }}>
    <Box sx={{
      px: 3, py: 2,
      display: 'flex', alignItems: 'flex-start', gap: 2,
      borderLeft: `3px solid ${P}`,
    }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
        bgcolor: alpha(P, 0.1),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LockIcon sx={{ fontSize: 16, color: P }} />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: P, mb: 0.4, lineHeight: 1.3 }}>
          Restricted Field | Administrators Only — Read Only
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', color: MUTED, lineHeight: 1.65 }}>
          Government ID numbers are protected records managed by the system. To request a correction, contact your Administrator.
        </Typography>
      </Box>
    </Box>
  </Box>
);
/* ── Education sub-tabs ── */
const EDU_TABS = ['Elem & Secondary', 'College', 'Graduate Studies', 'Vocational'];
const EduSubTabs = ({ value, onChange }) => (
  <Box sx={{ display: 'flex', gap: 0.5, mb: 2.5, p: 0.5, bgcolor: alpha(P, 0.04), borderRadius: 2, border: `1px solid ${alpha(P, 0.08)}`, flexWrap: 'wrap' }}>
    {EDU_TABS.map((tab, i) => (
      <Box key={i} onClick={() => onChange(i)} sx={{ px: 2, py: 0.75, borderRadius: 1.5, cursor: 'pointer', fontSize: '0.78rem', fontWeight: value === i ? 900 : 600, color: value === i ? '#fff' : MUTED, bgcolor: value === i ? P : 'transparent', transition: 'all 0.18s', '&:hover': { bgcolor: value === i ? P : alpha(P, 0.07), color: value === i ? '#fff' : P } }}>
        {tab}
      </Box>
    ))}
  </Box>
);

/* ── Percentage input ── */
const PctInput = ({ value, onChange, label }) => {
  const [v, setV] = useState(value || '');
  useEffect(() => setV(value || ''), [value]);
  const onCh = (e) => {
    let val = e.target.value.replace(/[^\d.]/g, '');
    const pts = val.split('.');
    if (pts.length > 2) val = pts[0] + '.' + pts.slice(1).join('');
    if (pts.length === 2 && pts[1].length > 2) val = pts[0] + '.' + pts[1].substring(0, 2);
    if (!isNaN(parseFloat(val)) && parseFloat(val) > 100) val = '100';
    setV(val); onChange(val);
  };
  return <Box><FL>{label}</FL><TextField value={v} onChange={onCh} placeholder="0.00" fullWidth size="small" InputProps={{ endAdornment: <InputAdornment position="end"><PercentIcon sx={{ color: P, fontSize: 16 }} /></InputAdornment> }} sx={FX} /></Box>;
};

/* ── Repeating block ── */
const RepBlock = ({ title, items, onAdd, onRemove, addLabel, children: renderItem }) => (
  <Box>
    {items.map((item, i) => (
      <Box key={i} sx={{ mb: 2, p: 2.5, bgcolor: alpha(P, 0.03), border: `1px solid ${alpha(P, 0.09)}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: `1px solid ${alpha(P, 0.1)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 3, height: 18, bgcolor: P, borderRadius: 2, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.67rem', fontWeight: 900, color: P, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title} #{i + 1}</Typography>
          </Box>
          <IconButton onClick={() => onRemove(i)} size="small" sx={{ color: '#b91c1c', border: `1px solid ${alpha('#b91c1c', 0.25)}`, borderRadius: 1.5, p: 0.5, '&:hover': { bgcolor: alpha('#b91c1c', 0.06) } }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
        </Box>
        <Grid container spacing={2}>{renderItem(item, i)}</Grid>
      </Box>
    ))}
    {items.length === 0 && (
      <Box sx={{ py: 5, textAlign: 'center', border: `1px dashed ${alpha(P, 0.18)}`, borderRadius: 2, bgcolor: alpha(P, 0.01) }}>
        <Typography sx={{ color: MUTED, fontSize: '0.85rem', fontWeight: 600 }}>No {title.toLowerCase()} records found</Typography>
      </Box>
    )}
    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
      <Btn sm startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={onAdd}>{addLabel}</Btn>
    </Box>
  </Box>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PROFILE COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const Profile = () => {
  const { person, profilePicture, loading, refresh: refreshPerson } = useProfileData();
  const { sections, loading: sectionsLoading, refresh: refreshSections } = useProfileSections();
  const { saveProfile, saving } = useProfileMutations();
  const { socket, connected } = useSocket();
  const userInfo       = getUserInfo();
  const employeeNumber = userInfo.employeeNumber || localStorage.getItem('employeeNumber');

  const [activeSection,   setActiveSection]   = useState(0);
  const [editOpen,        setEditOpen]        = useState(false);
  const [formData,        setFormData]        = useState({});
  const [imageZoomOpen,   setImageZoomOpen]   = useState(false);
  const [editImgZoom,     setEditImgZoom]     = useState(false);
  const [eduTab,          setEduTab]          = useState(0);
  const [toast,           setToast]           = useState({ open: false, message: '', severity: 'success' });
  const [overlayMessage,  setOverlayMessage]  = useState('');
  const [successOpen,     setSuccessOpen]     = useState(false);
  const [successAction,   setSuccessAction]   = useState('edit');

  const [childrenFD,  setChildrenFD]  = useState([]);
  const [collegesFD,  setCollegesFD]  = useState([]);
  const [graduatesFD, setGraduatesFD] = useState([]);
  const [eligFD,      setEligFD]      = useState([]);
  const [ldFD,        setLdFD]        = useState([]);
  const [oiFD,        setOiFD]        = useState([]);
  const [vocFD,       setVocFD]       = useState([]);
  const [weFD,        setWeFD]        = useState([]);
  const [vwFD,        setVwFD]        = useState([]);

  useEffect(() => {
    if (!sectionsLoading) {
      if (sections.children.length      > 0 && !childrenFD.length)  setChildrenFD(sections.children);
      if (sections.colleges.length      > 0 && !collegesFD.length)  setCollegesFD(sections.colleges);
      if (sections.graduates.length     > 0 && !graduatesFD.length) setGraduatesFD(sections.graduates);
      if (sections.eligibilities.length > 0 && !eligFD.length)      setEligFD(sections.eligibilities);
      if (sections.learningDevelopment.length > 0 && !ldFD.length)  setLdFD(sections.learningDevelopment);
      if (sections.otherInformation.length    > 0 && !oiFD.length)  setOiFD(sections.otherInformation);
      if (sections.vocational.length          > 0 && !vocFD.length) setVocFD(sections.vocational);
      if (sections.workExperiences.length     > 0 && !weFD.length)  setWeFD(sections.workExperiences);
    }
  }, [sections, sectionsLoading]);

  useEffect(() => {
    if (!employeeNumber) return;
    axios.get(`${API_BASE_URL}/VoluntaryRoute/voluntary-work`, getAuthHeaders())
      .then(res => setVwFD((res.data || []).filter(r => String(r.person_id) === String(employeeNumber))))
      .catch(err => console.error(err));
  }, [employeeNumber]);

  // ── Realtime refresh (Socket.IO) ─────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;

    const shouldRefresh = (payload) => {
      const ids = [
        payload?.personID,
        payload?.personId,
        payload?.person_id,
        payload?.employeeNumber,
        payload?.employee_number,
      ]
        .filter((v) => v != null)
        .map((v) => String(v));

      if (!employeeNumber) return false;
      if (ids.length === 0) return true; // if backend didn't include a target, safest is refresh
      return ids.includes(String(employeeNumber));
    };

    const handler = (payload) => {
      if (!shouldRefresh(payload)) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshPerson();
        refreshSections();
      }, 200);
    };

    // Keep aligned with section components' events
    const events = [
      'personalInfoChanged',
      'childrenTableChanged',
      'collegeTableChanged',
      'graduateChanged',
      'eligibilityChanged',
      'learningChanged',
      'otherInformationChanged',
      'vocationalChanged',
      'workExperienceTableChanged',
      'voluntaryWorkChanged',
    ];

    events.forEach((evt) => socket.on(evt, handler));
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      events.forEach((evt) => socket.off(evt, handler));
    };
  }, [socket, connected, employeeNumber, refreshPerson, refreshSections]);

  useEffect(() => {
    if (person && !Object.keys(formData).length) {
      const d = { ...person };
      if (person.birthDate) { const dt = new Date(person.birthDate); if (!isNaN(dt.getTime())) d.birthDate = dt.toISOString().split('T')[0]; }
      setFormData(d);
    }
  }, [person]);

  const { children, colleges, graduates, eligibilities, learningDevelopment: learningDev, otherInformation: otherInfo, vocational, workExperiences } = sections;

  const NAV = [
    { key:0,  label:'Personal Info',    icon:PersonIcon,            title:'Personal Information',   subtitle:'Basic details, physical attributes, and civil status.' },
    { key:1,  label:'Government IDs',   icon:BadgeIcon,          title:'Government Identification', subtitle:'Official government identification numbers.' },
    { key:2,  label:'Contact & Address',icon:CallIcon,              title:'Contact & Address',      subtitle:'Contact details, permanent and residential address.' },
    { key:3,  label:'Family',           icon:GroupIcon,             title:'Family Background',      subtitle:'Spouse, father, and mother information.' },
    { key:4,  label:'Education',        icon:SchoolIcon,            title:'Education History',      subtitle:'Academic records, degrees earned.' },
    { key:5,  label:'Children',         icon:ChildCareIcon,         title:'Children',               subtitle:'Children information and date of birth.' },
    { key:6,  label:'Work Experience',  icon:WorkIcon,              title:'Work Experience',        subtitle:'Professional history and appointments.' },
    { key:7,  label:'Eligibility',      icon:FactCheckIcon,         title:'Eligibility',            subtitle:'Civil service examination results and ratings.' },
    { key:8,  label:'Voluntary Work',   icon:VolunteerActivismIcon, title:'Voluntary Work',         subtitle:'Involvement in civic/NGO/voluntary organizations.' },
    { key:9,  label:'Learning and Development',   icon:BookIcon,         title:'Learning and Development', subtitle:'Seminars | Interventions | Training programs attended.' },
    { key:10, label:'Other Information',       icon:InfoIcon,              title:'Other Information',      subtitle:'Special skills, distinctions, and associations.' },
  ];

  const notify     = (msg, sev = 'success') => setToast({ open: true, message: msg, severity: sev });
  const fmt        = (v) => { if (!v) return ''; const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-PH'); };
  const getAge     = (dob) => { if (!dob) return 'N/A'; const t = new Date(), b = new Date(dob); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  const fmtR       = (r) => { const n = parseFloat(r); return isNaN(n) ? 'N/A' : `${n}%`; };

  const mk = (get, set) => ({
    change: (i, e) => { const u = [...get]; u[i] = { ...u[i], [e.target.name]: e.target.value }; set(u); },
    add:    (blank) => set([...get, { ...blank, person_id: employeeNumber }]),
    remove: (i) => { const u = [...get]; u.splice(i, 1); set(u); },
  });
  const childH  = mk(childrenFD,  setChildrenFD);
  const colH    = mk(collegesFD,  setCollegesFD);
  const gradH   = mk(graduatesFD, setGraduatesFD);
  const eligH   = mk(eligFD,      setEligFD);
  const ldH     = mk(ldFD,        setLdFD);
  const oiH     = mk(oiFD,        setOiFD);
  const vocH    = mk(vocFD,       setVocFD);
  const weH     = mk(weFD,        setWeFD);
  const vwH     = mk(vwFD,        setVwFD);

  const onFD = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    try {
      setOverlayMessage('Saving profile…');
      await saveProfile({ personalInfo: formData, children: childrenFD, colleges: collegesFD, graduates: graduatesFD, eligibilities: eligFD, learningDevelopment: ldFD, otherInformation: oiFD, vocational: vocFD, workExperiences: weFD, voluntaryWork: vwFD });
      setEditOpen(false);
      setSuccessAction('edit');
      setSuccessOpen(true);
      notify('Profile updated successfully!');
      refreshPerson();
      refreshSections();
    } catch (err) { notify(err.message || 'Update failed', 'error'); }
    finally { setOverlayMessage(''); }
  };

  const handlePicture = async (e) => {
    const file = e.target.files[0]; if (!file || !employeeNumber) return;
    if (!['image/jpeg','image/jpg','image/png','image/gif'].includes(file.type)) { notify('JPEG, PNG, or GIF only', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { notify('Max 5MB', 'error'); return; }
    const fd = new FormData(); fd.append('profile', file);
    try {
      setOverlayMessage('Uploading profile picture…');
      const ah = getAuthHeaders({ includeContentType: false });
      await axios.post(`${API_BASE_URL}/upload-profile-picture/${employeeNumber}`, fd, { headers: { ...ah.headers, 'Content-Type': 'multipart/form-data' }, timeout: 30000 });
      refreshPerson();
      setSuccessAction('edit');
      setSuccessOpen(true);
      notify('Profile picture updated!');
    } catch (err) { notify(err.response?.data?.message || 'Upload failed', 'error'); }
    finally { setOverlayMessage(''); }
  };

  const handleRemovePic = async () => {
    if (!person?.id) return;
    try {
      setOverlayMessage('Removing profile picture…');
      await axios.delete(`${API_BASE_URL}/personalinfo/remove-profile-picture/${person.id}`, getAuthHeaders());
      refreshPerson();
      setSuccessAction('delete');
      setSuccessOpen(true);
      notify('Picture removed.');
    }
    catch { notify('Failed to remove.', 'error'); }
    finally { setOverlayMessage(''); }
  };

  /* ── Field renderer ── */
  const FF = (field) => {
    if (field.type === 'select') return (
      <Box key={field.name}><FL>{field.label}</FL>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <Select
            name={field.name}
            value={formData[field.name] || ''}
            onChange={onFD}
            disabled={field.disabled}
            sx={SELECT_SX}
          >
            <MuiMenuItem value=""><em style={{ color: '#9ca3af' }}>— Select —</em></MuiMenuItem>
            {(field.options || []).map(o => <MuiMenuItem key={o} value={o}>{o}</MuiMenuItem>)}
          </Select>
        </FormControl>
      </Box>
    );
    return (
      <Box key={field.name}><FL>{field.label}</FL>
        <TextField
          fullWidth size="small"
          sx={{ ...FX, mb: 2 }}
          name={field.name}
          value={formData[field.name] || ''}
          onChange={onFD}
          disabled={field.disabled}
          type={field.type || 'text'}
          InputLabelProps={field.type === 'date' ? { shrink: true } : {}}
        />
      </Box>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     VIEW CONTENT
  ───────────────────────────────────────────────────────────────────────── */
  const renderView = (idx) => {
    const anim = { animation: 'sectionIn 0.28s ease' };

    switch (idx) {
      case 0: return <Box sx={anim}><InfoGrid>
        <InfoGroup label="First Name"     value={person?.firstName} />
        <InfoGroup label="Middle Name"    value={person?.middleName} />
        <InfoGroup label="Last Name"      value={person?.lastName} />
        <InfoGroup label="Name Extension" value={person?.nameExtension} />
        <InfoGroup label="Date of Birth"  value={person?.birthDate ? fmt(person.birthDate) : null} />
        <InfoGroup label="Place of Birth" value={person?.placeOfBirth} />
        <InfoGroup label="Sex"            value={person?.sex} />
        <InfoGroup label="Civil Status"   value={person?.civilStatus} />
        <InfoGroup label="Height (m)"     value={person?.heightCm} />
        <InfoGroup label="Weight (kg)"    value={person?.weightKg} />
        <InfoGroup label="Blood Type"     value={person?.bloodType} />
        <InfoGroup label="Citizenship"    value={person?.citizenship} />
      </InfoGrid></Box>;

      case 1: return <Box sx={anim}><InfoGrid>
        <InfoGroup label="GSIS No."            value={person?.gsisNum} />
        <InfoGroup label="Pag-IBIG No."        value={person?.pagibigNum} />
        <InfoGroup label="PhilHealth No."      value={person?.philhealthNum} />
        <InfoGroup label="SSS No."             value={person?.sssNum} />
        <InfoGroup label="TIN No."             value={person?.tinNum} />
        <InfoGroup label="Agency Employee No." value={person?.agencyEmployeeNum} />
      </InfoGrid></Box>;

      case 2: return <Box sx={anim}>
        <Div label="Contact Information" />
        <InfoGrid sx={{ mb: 3.5 }}>
          <InfoGroup label="Mobile Number" value={person?.mobileNum} />
          <InfoGroup label="Telephone"     value={person?.telephone} />
          <InfoGroup label="Email Address" value={person?.emailAddress} />
        </InfoGrid>
        <Div label="Permanent Address" />
        <InfoGrid sx={{ mb: 3.5 }}>
          <InfoGroup label="House/Block/Lot"     value={person?.permanent_houseBlockLotNum} />
          <InfoGroup label="Street"              value={person?.permanent_streetName} />
          <InfoGroup label="Subdivision/Village" value={person?.permanent_subdivisionOrVillage} />
          <InfoGroup label="Barangay"            value={person?.permanent_barangay} />
          <InfoGroup label="City/Municipality"   value={person?.permanent_cityOrMunicipality} />
          <InfoGroup label="Province"            value={person?.permanent_provinceName} />
          <InfoGroup label="Zip Code"            value={person?.permanent_zipcode} />
        </InfoGrid>
        <Div label="Residential Address" />
        <InfoGrid>
          <InfoGroup label="House/Block/Lot"     value={person?.residential_houseBlockLotNum} />
          <InfoGroup label="Street"              value={person?.residential_streetName} />
          <InfoGroup label="Subdivision/Village" value={person?.residential_subdivisionOrVillage} />
          <InfoGroup label="Barangay"            value={person?.residential_barangayName} />
          <InfoGroup label="City/Municipality"   value={person?.residential_cityOrMunicipality} />
          <InfoGroup label="Province"            value={person?.residential_provinceName} />
          <InfoGroup label="Zip Code"            value={person?.residential_zipcode} />
        </InfoGrid>
      </Box>;

      case 3: return <Box sx={anim}>
        <Div label="Spouse" />
        <InfoGrid sx={{ mb: 3.5 }}>
          <InfoGroup label="Full Name"          value={[person?.spouseFirstName, person?.spouseMiddleName, person?.spouseLastName, person?.spouseNameExtension].filter(Boolean).join(' ')} />
          <InfoGroup label="Occupation"         value={person?.spouseOccupation} />
          <InfoGroup label="Employer/Business"  value={person?.spouseEmployerBusinessName} />
          <InfoGroup label="Business Address"   value={person?.spouseBusinessAddress} />
          <InfoGroup label="Telephone"          value={person?.spouseTelephone} />
        </InfoGrid>
        <Div label="Father" />
        <InfoGrid sx={{ mb: 3.5 }}>
          <InfoGroup label="Full Name" value={[person?.fatherFirstName, person?.fatherMiddleName, person?.fatherLastName, person?.fatherNameExtension].filter(Boolean).join(' ')} />
        </InfoGrid>
        <Div label="Mother (Maiden Name)" />
        <InfoGrid>
          <InfoGroup label="Full Name" value={[person?.motherMaidenFirstName, person?.motherMaidenMiddleName, person?.motherMaidenLastName].filter(Boolean).join(' ')} />
        </InfoGrid>
      </Box>;

      case 4: return <Box sx={anim}>
        <EduSubTabs value={eduTab} onChange={setEduTab} />
        {eduTab === 0 && <>
          <Div label="Elementary" />
          <InfoGrid sx={{ mb: 3.5 }}>
            <InfoGroup label="School Name"      value={person?.elementaryNameOfSchool} />
            <InfoGroup label="Degree/Course"    value={person?.elementaryDegree} />
            <InfoGroup label="Period From"      value={person?.elementaryPeriodFrom} />
            <InfoGroup label="Period To"        value={person?.elementaryPeriodTo} />
            <InfoGroup label="Highest Attained" value={person?.elementaryHighestAttained} />
            <InfoGroup label="Year Graduated"   value={person?.elementaryYearGraduated} />
          </InfoGrid>
          <Div label="Secondary" />
          <InfoGrid>
            <InfoGroup label="School Name"      value={person?.secondaryNameOfSchool} />
            <InfoGroup label="Degree/Course"    value={person?.secondaryDegree} />
            <InfoGroup label="Period From"      value={person?.secondaryPeriodFrom} />
            <InfoGroup label="Period To"        value={person?.secondaryPeriodTo} />
            <InfoGroup label="Highest Attained" value={person?.secondaryHighestAttained} />
            <InfoGroup label="Year Graduated"   value={person?.secondaryYearGraduated} />
          </InfoGrid>
        </>}
        {eduTab === 1 && (colleges.length > 0
          ? <TLWrap>{colleges.map((c, i) => <TLItem key={c.id || i} date={`${c.collegePeriodFrom || 'N/A'} – ${c.collegePeriodTo || 'Present'}`} title={c.collegeDegree} sub={c.collegeNameOfSchool} last={i === colleges.length - 1} />)}</TLWrap>
          : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No college records</Typography></Box>)}
        {eduTab === 2 && (graduates.length > 0
          ? <TLWrap>{graduates.map((g, i) => <TLItem key={g.id || i} date={`${g.graduatePeriodFrom || 'N/A'} – ${g.graduatePeriodTo || 'Present'}`} title={g.graduateDegree} sub={g.graduateNameOfSchool} last={i === graduates.length - 1} />)}</TLWrap>
          : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No graduate studies records</Typography></Box>)}
        {eduTab === 3 && (vocational.length > 0
          ? <TLWrap>{vocational.map((v, i) => <TLItem key={v.id || i} date={`${v.vocationalPeriodFrom || 'N/A'} – ${v.vocationalPeriodTo || 'Present'}`} title={v.vocationalDegree} sub={v.vocationalNameOfSchool} last={i === vocational.length - 1} />)}</TLWrap>
          : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No vocational records</Typography></Box>)}
      </Box>;

      case 5: return <Box sx={anim}>
        {children.length > 0 ? children.map((c, i) => (
          <ListCard key={c.id || i}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ChildCareIcon sx={{ fontSize: 14, color: P }} />
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: P, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Child {i + 1}</Typography>
            </Box>
            <InfoGrid>
              <InfoGroup label="Full Name"     value={[c.childrenFirstName, c.childrenMiddleName, c.childrenLastName, c.childrenNameExtension].filter(Boolean).join(' ')} />
              <InfoGroup label="Date of Birth" value={c.dateOfBirth ? `${fmt(c.dateOfBirth)} (Age ${getAge(c.dateOfBirth)})` : null} />
            </InfoGrid>
          </ListCard>
        )) : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No children records</Typography></Box>}
      </Box>;

      case 6: return <Box sx={anim}>
        {workExperiences.length > 0 ? (
          <TLWrap>{workExperiences.map((w, i) => <TLItem key={w.id || i}
            date={`${w.workDateFrom ? fmt(w.workDateFrom) : 'N/A'} – ${w.workDateTo ? fmt(w.workDateTo) : 'Present'}`}
            title={w.workPositionTitle}
            sub={w.workCompany}
            last={i === workExperiences.length - 1}
            tags={[w.workMonthlySalary && `₱${parseFloat(w.workMonthlySalary).toLocaleString()}/mo`, w.StatusOfAppointment, w.isGovtService && (w.isGovtService === 'Yes' ? 'Government' : 'Private')].filter(Boolean)}
          />)}</TLWrap>
        ) : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No work experience records</Typography></Box>}
      </Box>;

      case 7: return <Box sx={anim}>
        {eligibilities.length > 0 ? eligibilities.map((e, i) => (
          <ListCard key={e.id || i}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <VerifiedUserIcon sx={{ fontSize: 14, color: P }} />
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: P, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Eligibility {i + 1}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: TXT, mb: 1.5, lineHeight: 1.4 }}>{e.eligibilityName || '—'}</Typography>
            <InfoGrid>
              <InfoGroup label="Rating"        value={fmtR(e.eligibilityRating)} />
              <InfoGroup label="Date of Exam"  value={e.eligibilityDateOfExam ? fmt(e.eligibilityDateOfExam) : null} />
              <InfoGroup label="Place of Exam" value={e.eligibilityPlaceOfExam} />
              <InfoGroup label="License No."   value={e.licenseNumber} />
              <InfoGroup label="Valid Until"   value={e.DateOfValidity ? fmt(e.DateOfValidity) : null} />
            </InfoGrid>
          </ListCard>
        )) : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No eligibility records</Typography></Box>}
      </Box>;

      case 8: return <Box sx={anim}>
        {vwFD.length > 0
          ? <TLWrap>{vwFD.map((vw, i) => <TLItem key={vw.id || i} date={`${vw.dateFrom ? fmt(vw.dateFrom) : 'N/A'} – ${vw.dateTo ? fmt(vw.dateTo) : 'Present'}`} title={vw.natureOfWork} sub={vw.nameAndAddress} tags={vw.numberOfHours ? [`${vw.numberOfHours} hrs`] : []} last={i === vwFD.length - 1} />)}</TLWrap>
          : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No voluntary work records</Typography></Box>}
      </Box>;

      case 9: return <Box sx={anim}>
        {learningDev.length > 0
          ? <TLWrap>{learningDev.map((l, i) => <TLItem key={l.id || i} date={`${l.dateFrom ? fmt(l.dateFrom) : 'N/A'} – ${l.dateTo ? fmt(l.dateTo) : 'Present'}`} title={l.titleOfProgram} sub={l.conductedSponsored} tags={[l.typeOfLearningDevelopment, l.numberOfHours ? `${l.numberOfHours} hrs` : null].filter(Boolean)} last={i === learningDev.length - 1} />)}</TLWrap>
          : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No learning and development records</Typography></Box>}
      </Box>;

      case 10: return <Box sx={anim}>
        {otherInfo.length > 0 ? otherInfo.map((info, i) => (
          <ListCard key={info.id || i}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <InfoIcon sx={{ fontSize: 14, color: P }} />
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: P, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entry {i + 1}</Typography>
            </Box>
            <InfoGrid>
              <InfoGroup label="Special Skills"            value={info.specialSkills} />
              <InfoGroup label="Non-Academic Distinctions" value={info.nonAcademicDistinctions} />
              <InfoGroup label="Membership in Association" value={info.membershipInAssociation} />
            </InfoGrid>
          </ListCard>
        )) : <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ color: MUTED }}>No other information records</Typography></Box>}
      </Box>;

      default: return null;
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     EDIT FORM CONTENT
  ───────────────────────────────────────────────────────────────────────── */
  const renderEdit = () => {
    if (activeSection === 0) return <Grid container spacing={2.5}>
      {[{ label:'First Name', name:'firstName' }, { label:'Middle Name', name:'middleName' }, { label:'Last Name', name:'lastName' }, { label:'Name Extension', name:'nameExtension' }, { label:'Date of Birth', name:'birthDate', type:'date' }, { label:'Place of Birth', name:'placeOfBirth' }, { label:'Sex', name:'sex', type:'select', options:['Male','Female'] }, { label:'Civil Status', name:'civilStatus', type:'select', options:['Single','Married','Widowed','Separated','Divorced','Annulled'] }, { label:'Height (m)', name:'heightCm' }, { label:'Weight (kg)', name:'weightKg' }, { label:'Blood Type', name:'bloodType', type:'select', options:['A+','A-','B+','B-','AB+','AB-','O+','O-'] }, { label:'Citizenship', name:'citizenship' }]
        .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
    </Grid>;

    /* ── Government IDs — read-only with notice ── */
    if (activeSection === 1) return <Box>
      <GovIdNotice />
      <Grid container spacing={2.5}>
{[
  { label:'GSIS Number',           name:'gsisNum'           },
  { label:'Pag-IBIG Number',       name:'pagibigNum'        },
  { label:'PhilHealth Number',     name:'philhealthNum'     },
  { label:'SSS Number',            name:'sssNum'            },
  { label:'TIN Number',            name:'tinNum'            },
  { label:'Agency Employee Number',name:'agencyEmployeeNum' },
].map(f => (
  <Grid item xs={12} sm={6} key={f.name}>
    <Box><FL>{f.label}</FL>
      <TextField
        fullWidth size="small"
        sx={{ ...FX, mb: 2,
          '& .MuiOutlinedInput-root.Mui-disabled': {
            bgcolor: SUBTLE,
            '& fieldset': { borderColor: BD },
            '& .MuiInputBase-input': {
              color: MUTED,
              WebkitTextFillColor: MUTED,
              cursor: 'not-allowed',
            },
          },
        }}
        name={f.name}
        value={formData[f.name] || ''}
        disabled
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <LockIcon sx={{ fontSize: 13, color: alpha(TXT, 0.18) }} />
            </InputAdornment>
          ),
        }}
      />
    </Box>
  </Grid>
))}
      </Grid>
    </Box>;

    if (activeSection === 2) return <Box>
      <Div label="Contact" />
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        {[{ label:'Telephone', name:'telephone' }, { label:'Mobile Number', name:'mobileNum' }, { label:'Email Address', name:'emailAddress' }]
          .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
      </Grid>
      <Div label="Permanent Address" />
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        {[{ label:'House/Block/Lot No.', name:'permanent_houseBlockLotNum' }, { label:'Street', name:'permanent_streetName' }, { label:'Subdivision/Village', name:'permanent_subdivisionOrVillage' }, { label:'Barangay', name:'permanent_barangay' }, { label:'City/Municipality', name:'permanent_cityOrMunicipality' }, { label:'Province', name:'permanent_provinceName' }, { label:'Zip Code', name:'permanent_zipcode' }]
          .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
      </Grid>
      <Div label="Residential Address" />
      <Grid container spacing={2.5}>
        {[{ label:'House/Block/Lot No.', name:'residential_houseBlockLotNum' }, { label:'Street', name:'residential_streetName' }, { label:'Subdivision/Village', name:'residential_subdivisionOrVillage' }, { label:'Barangay', name:'residential_barangayName' }, { label:'City/Municipality', name:'residential_cityOrMunicipality' }, { label:'Province', name:'residential_provinceName' }, { label:'Zip Code', name:'residential_zipcode' }]
          .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
      </Grid>
    </Box>;

    if (activeSection === 3) return <Box>
      <Div label="Spouse" />
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        {[{ label:'Last Name', name:'spouseLastName' }, { label:'First Name', name:'spouseFirstName' }, { label:'Middle Name', name:'spouseMiddleName' }, { label:'Name Extension', name:'spouseNameExtension' }, { label:'Occupation', name:'spouseOccupation' }, { label:'Employer/Business Name', name:'spouseEmployerBusinessName' }, { label:'Business Address', name:'spouseBusinessAddress' }, { label:'Telephone No.', name:'spouseTelephone' }]
          .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
      </Grid>
      <Div label="Father" />
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        {[{ label:'Last Name', name:'fatherLastName' }, { label:'First Name', name:'fatherFirstName' }, { label:'Middle Name', name:'fatherMiddleName' }, { label:'Name Extension', name:'fatherNameExtension' }]
          .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
      </Grid>
      <Div label="Mother (Maiden Name)" />
      <Grid container spacing={2.5}>
        {[{ label:'Maiden Last Name', name:'motherMaidenLastName' }, { label:'Maiden First Name', name:'motherMaidenFirstName' }, { label:'Maiden Middle Name', name:'motherMaidenMiddleName' }]
          .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
      </Grid>
    </Box>;

    if (activeSection === 4) return <Box>
      <EduSubTabs value={eduTab} onChange={setEduTab} />
      {eduTab === 0 && <Box>
        <Div label="Elementary" />
        <Grid container spacing={2.5} sx={{ mb: 1 }}>
          {[{ label:'School Name', name:'elementaryNameOfSchool' }, { label:'Degree/Course', name:'elementaryDegree' }, { label:'Period From', name:'elementaryPeriodFrom' }, { label:'Period To', name:'elementaryPeriodTo' }, { label:'Highest Level/Units Earned', name:'elementaryHighestAttained' }, { label:'Year Graduated', name:'elementaryYearGraduated' }, { label:'Honors Received', name:'elementaryScholarshipAcademicHonorsReceived' }]
            .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
        </Grid>
        <Div label="Secondary" />
        <Grid container spacing={2.5}>
          {[{ label:'School Name', name:'secondaryNameOfSchool' }, { label:'Degree/Course', name:'secondaryDegree' }, { label:'Period From', name:'secondaryPeriodFrom' }, { label:'Period To', name:'secondaryPeriodTo' }, { label:'Highest Level/Units Earned', name:'secondaryHighestAttained' }, { label:'Year Graduated', name:'secondaryYearGraduated' }, { label:'Honors Received', name:'secondaryScholarshipAcademicHonorsReceived' }]
            .map(f => <Grid item xs={12} sm={6} key={f.name}>{FF(f)}</Grid>)}
        </Grid>
      </Box>}
      {eduTab === 1 && <RepBlock title="College" items={collegesFD} onAdd={() => colH.add({ collegeNameOfSchool:'', collegeDegree:'', collegePeriodFrom:'', collegePeriodTo:'', collegeHighestAttained:'', collegeYearGraduated:'', collegeScholarshipAcademicHonorsReceived:'' })} onRemove={i => colH.remove(i)} addLabel="Add College">
        {(c, i) => <>
          <Grid item xs={12}><FL>School Name</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="collegeNameOfSchool" value={c.collegeNameOfSchool || ''} onChange={e => colH.change(i, e)} /></Grid>
          <Grid item xs={12}><FL>Degree/Course</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="collegeDegree" value={c.collegeDegree || ''} onChange={e => colH.change(i, e)} /></Grid>
          {[['Period From','collegePeriodFrom'],['Period To','collegePeriodTo'],['Highest Level','collegeHighestAttained'],['Year Graduated','collegeYearGraduated']].map(([l,n]) => <Grid item xs={12} sm={6} key={n}><FL>{l}</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name={n} value={c[n] || ''} onChange={e => colH.change(i, e)} /></Grid>)}
          <Grid item xs={12}><FL>Honors Received</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="collegeScholarshipAcademicHonorsReceived" value={c.collegeScholarshipAcademicHonorsReceived || ''} onChange={e => colH.change(i, e)} /></Grid>
        </>}
      </RepBlock>}
      {eduTab === 2 && <RepBlock title="Graduate Studies" items={graduatesFD} onAdd={() => gradH.add({ graduateNameOfSchool:'', graduateDegree:'', graduatePeriodFrom:'', graduatePeriodTo:'', graduateHighestLevel:'', graduateYearGraduated:'', graduateScholarshipAcademicHonorsReceived:'' })} onRemove={i => gradH.remove(i)} addLabel="Add Graduate Studies">
        {(g, i) => <>
          <Grid item xs={12}><FL>School Name</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="graduateNameOfSchool" value={g.graduateNameOfSchool || ''} onChange={e => gradH.change(i, e)} /></Grid>
          <Grid item xs={12}><FL>Degree/Course</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="graduateDegree" value={g.graduateDegree || ''} onChange={e => gradH.change(i, e)} /></Grid>
          {[['Period From','graduatePeriodFrom'],['Period To','graduatePeriodTo'],['Highest Level','graduateHighestLevel'],['Year Graduated','graduateYearGraduated']].map(([l,n]) => <Grid item xs={12} sm={6} key={n}><FL>{l}</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name={n} value={g[n] || ''} onChange={e => gradH.change(i, e)} /></Grid>)}
          <Grid item xs={12}><FL>Honors Received</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="graduateScholarshipAcademicHonorsReceived" value={g.graduateScholarshipAcademicHonorsReceived || ''} onChange={e => gradH.change(i, e)} /></Grid>
        </>}
      </RepBlock>}
      {eduTab === 3 && <RepBlock title="Vocational" items={vocFD} onAdd={() => vocH.add({ vocationalNameOfSchool:'', vocationalDegree:'', vocationalPeriodFrom:'', vocationalPeriodTo:'', vocationalHighestAttained:'', vocationalYearGraduated:'', vocationalScholarshipAcademicHonorsReceived:'' })} onRemove={i => vocH.remove(i)} addLabel="Add Vocational">
        {(v, i) => <>
          <Grid item xs={12}><FL>School Name</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="vocationalNameOfSchool" value={v.vocationalNameOfSchool || ''} onChange={e => vocH.change(i, e)} /></Grid>
          <Grid item xs={12}><FL>Degree/Course</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="vocationalDegree" value={v.vocationalDegree || ''} onChange={e => vocH.change(i, e)} /></Grid>
          {[['Period From','vocationalPeriodFrom'],['Period To','vocationalPeriodTo'],['Highest Level','vocationalHighestAttained'],['Year Graduated','vocationalYearGraduated']].map(([l,n]) => <Grid item xs={12} sm={6} key={n}><FL>{l}</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name={n} value={v[n] || ''} onChange={e => vocH.change(i, e)} /></Grid>)}
          <Grid item xs={12}><FL>Honors Received</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="vocationalScholarshipAcademicHonorsReceived" value={v.vocationalScholarshipAcademicHonorsReceived || ''} onChange={e => vocH.change(i, e)} /></Grid>
        </>}
      </RepBlock>}
    </Box>;

    if (activeSection === 5) return <RepBlock title="Child" items={childrenFD} onAdd={() => childH.add({ childrenFirstName:'', childrenMiddleName:'', childrenLastName:'', childrenNameExtension:'', dateOfBirth:'' })} onRemove={i => childH.remove(i)} addLabel="Add Child">
      {(c, i) => <>
        {[['First Name','childrenFirstName'],['Middle Name','childrenMiddleName'],['Last Name','childrenLastName'],['Name Extension','childrenNameExtension']].map(([l,n]) => <Grid item xs={12} sm={6} key={n}><FL>{l}</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name={n} value={c[n] || ''} onChange={e => childH.change(i, e)} /></Grid>)}
        <Grid item xs={12} sm={6}><FL>Date of Birth</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="dateOfBirth" type="date" value={c.dateOfBirth || ''} onChange={e => childH.change(i, e)} InputLabelProps={{ shrink: true }} /></Grid>
      </>}
    </RepBlock>;

    if (activeSection === 6) return <RepBlock title="Work Experience" items={weFD} onAdd={() => weH.add({ workDateFrom:'', workDateTo:'', workPositionTitle:'', workCompany:'', workMonthlySalary:'', SalaryJobOrPayGrade:'', StatusOfAppointment:'', isGovtService:'No' })} onRemove={i => weH.remove(i)} addLabel="Add Work Experience">
      {(w, i) => <>
        <Grid item xs={12} sm={6}><FL>Date From</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="workDateFrom" type="date" value={w.workDateFrom || ''} onChange={e => weH.change(i, e)} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12} sm={6}><FL>Date To</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="workDateTo" type="date" value={w.workDateTo || ''} onChange={e => weH.change(i, e)} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12}><FL>Position Title</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="workPositionTitle" value={w.workPositionTitle || ''} onChange={e => weH.change(i, e)} /></Grid>
        <Grid item xs={12}><FL>Department / Agency / Company</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="workCompany" value={w.workCompany || ''} onChange={e => weH.change(i, e)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Monthly Salary</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="workMonthlySalary" value={w.workMonthlySalary || ''} onChange={e => weH.change(i, e)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Salary/Job/Pay Grade</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="SalaryJobOrPayGrade" value={w.SalaryJobOrPayGrade || ''} onChange={e => weH.change(i, e)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Status of Appointment</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="StatusOfAppointment" value={w.StatusOfAppointment || ''} onChange={e => weH.change(i, e)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Government Service</FL>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <Select name="isGovtService" value={w.isGovtService || 'No'} onChange={e => weH.change(i, e)} sx={SELECT_SX}>
              <MuiMenuItem value="Yes">Yes</MuiMenuItem><MuiMenuItem value="No">No</MuiMenuItem>
            </Select>
          </FormControl>
        </Grid>
      </>}
    </RepBlock>;

    if (activeSection === 7) return <RepBlock title="Eligibility" items={eligFD} onAdd={() => eligH.add({ eligibilityName:'', eligibilityRating:'', eligibilityDateOfExam:'', eligibilityPlaceOfExam:'', licenseNumber:'', DateOfValidity:'' })} onRemove={i => eligH.remove(i)} addLabel="Add Eligibility">
      {(e, i) => <>
        <Grid item xs={12}><FL>Career Service / Eligibility Name</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="eligibilityName" value={e.eligibilityName || ''} onChange={ev => eligH.change(i, ev)} /></Grid>
        <Grid item xs={12}><PctInput label="Rating (if applicable)" value={e.eligibilityRating || ''} onChange={v => eligH.change(i, { target: { name: 'eligibilityRating', value: v } })} /></Grid>
        <Grid item xs={12} sm={6}><FL>Date of Exam</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="eligibilityDateOfExam" type="date" value={e.eligibilityDateOfExam || ''} onChange={ev => eligH.change(i, ev)} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12} sm={6}><FL>Place of Exam</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="eligibilityPlaceOfExam" value={e.eligibilityPlaceOfExam || ''} onChange={ev => eligH.change(i, ev)} /></Grid>
        <Grid item xs={12} sm={6}><FL>License Number</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="licenseNumber" value={e.licenseNumber || ''} onChange={ev => eligH.change(i, ev)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Date of Validity</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="DateOfValidity" type="date" value={e.DateOfValidity || ''} onChange={ev => eligH.change(i, ev)} InputLabelProps={{ shrink: true }} /></Grid>
      </>}
    </RepBlock>;

    if (activeSection === 8) return <RepBlock title="Voluntary Work" items={vwFD} onAdd={() => vwH.add({ nameAndAddress:'', dateFrom:'', dateTo:'', numberOfHours:'', natureOfWork:'' })} onRemove={i => vwH.remove(i)} addLabel="Add Voluntary Work">
      {(vw, i) => <>
        <Grid item xs={12}><FL>Name & Address of Organization</FL><TextField fullWidth sx={{ ...MFX, mb: 1 }} name="nameAndAddress" value={vw.nameAndAddress || ''} onChange={e => vwH.change(i, e)} multiline rows={2} /></Grid>
        <Grid item xs={12} sm={6}><FL>Date From</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="dateFrom" type="date" value={vw.dateFrom || ''} onChange={e => vwH.change(i, e)} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12} sm={6}><FL>Date To</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="dateTo" type="date" value={vw.dateTo || ''} onChange={e => vwH.change(i, e)} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12} sm={6}><FL>Number of Hours</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="numberOfHours" value={vw.numberOfHours || ''} onChange={e => vwH.change(i, e)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Position / Nature of Work</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="natureOfWork" value={vw.natureOfWork || ''} onChange={e => vwH.change(i, e)} /></Grid>
      </>}
    </RepBlock>;

    if (activeSection === 9) return <RepBlock title="Training Program" items={ldFD} onAdd={() => ldH.add({ titleOfProgram:'', dateFrom:'', dateTo:'', numberOfHours:'', typeOfLearningDevelopment:'', conductedSponsored:'' })} onRemove={i => ldH.remove(i)} addLabel="Add Training Program">
      {(l, i) => <>
        <Grid item xs={12}><FL>Title of Program</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="titleOfProgram" value={l.titleOfProgram || ''} onChange={e => ldH.change(i, e)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Date From</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="dateFrom" type="date" value={l.dateFrom || ''} onChange={e => ldH.change(i, e)} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12} sm={6}><FL>Date To</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="dateTo" type="date" value={l.dateTo || ''} onChange={e => ldH.change(i, e)} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid item xs={12} sm={6}><FL>Number of Hours</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="numberOfHours" value={l.numberOfHours || ''} onChange={e => ldH.change(i, e)} /></Grid>
        <Grid item xs={12} sm={6}><FL>Type of L&D</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="typeOfLearningDevelopment" value={l.typeOfLearningDevelopment || ''} onChange={e => ldH.change(i, e)} /></Grid>
        <Grid item xs={12}><FL>Conducted / Sponsored By</FL><TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} name="conductedSponsored" value={l.conductedSponsored || ''} onChange={e => ldH.change(i, e)} /></Grid>
      </>}
    </RepBlock>;

    if (activeSection === 10) return <RepBlock title="Entry" items={oiFD} onAdd={() => oiH.add({ specialSkills:'', nonAcademicDistinctions:'', membershipInAssociation:'' })} onRemove={i => oiH.remove(i)} addLabel="Add Other Information">
      {(info, i) => <>
        <Grid item xs={12}><FL>Special Skills and Hobbies</FL><TextField fullWidth sx={{ ...MFX, mb: 1 }} name="specialSkills" value={info.specialSkills || ''} onChange={e => oiH.change(i, e)} multiline rows={2} /></Grid>
        <Grid item xs={12}><FL>Non-Academic Distinctions / Recognition</FL><TextField fullWidth sx={{ ...MFX, mb: 1 }} name="nonAcademicDistinctions" value={info.nonAcademicDistinctions || ''} onChange={e => oiH.change(i, e)} multiline rows={2} /></Grid>
        <Grid item xs={12}><FL>Membership in Association / Organization</FL><TextField fullWidth sx={{ ...MFX, mb: 1 }} name="membershipInAssociation" value={info.membershipInAssociation || ''} onChange={e => oiH.change(i, e)} multiline rows={2} /></Grid>
      </>}
    </RepBlock>;

    return null;
  };

  /* ─────────────────────────────────────────────────────────────────────────
     LOADING GATE
  ───────────────────────────────────────────────────────────────────────── */
  if (loading || sectionsLoading) return <ProfileWireframe />;

  const currentNav = NAV[activeSection] || NAV[0];
  const fullName   = person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : 'Employee Profile';
  const profileSrc = profilePicture ? `${API_BASE_URL}${profilePicture}?t=${Date.now()}` : undefined;

  /* ─────────────────────────────────────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden', bgcolor: PAGE_BG }}>
      <style>{GLOBAL_CSS}</style>

      <LoadingOverlay
        open={saving || Boolean(overlayMessage)}
        message={overlayMessage || 'Saving profile…'}
      />
      <SuccessfulOverlay
        open={successOpen}
        action={successAction}
        onClose={() => setSuccessOpen(false)}
      />

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <Box sx={{
        width: '100vw', maxWidth: '100%', position: 'relative',
        left: '63%', transform: 'translateX(-61%)', boxSizing: 'border-box',
        pl: { xs: 2, sm: 3, md: 6 }, pr: `${SIDEBAR_W + 16}px`,
        py: { xs: 2, md: 4 },
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { background: '#f0f0f0' },
        '&::-webkit-scrollbar-thumb': { background: alpha(P, 0.25), borderRadius: 4, '&:hover': { background: alpha(P, 0.45) } },
      }}>

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5, flexWrap: 'wrap', animation: 'bannerSlide 0.4s ease' }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: MUTED }}>Profile</Typography>
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: BD }} />
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: P, fontWeight: 700 }}>{currentNav.title}</Typography>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {[
              { disabled: activeSection === 0, onClick: () => setActiveSection(s => s - 1), icon: <ArrowBackIosIcon sx={{ fontSize: 11 }} /> },
              { disabled: activeSection === NAV.length - 1, onClick: () => setActiveSection(s => s + 1), icon: <ArrowForwardIosIcon sx={{ fontSize: 11 }} /> },
            ].map((b, i) => (
              <IconButton key={i} size="small" disabled={b.disabled} onClick={b.onClick}
                sx={{ width: 30, height: 30, border: `1px solid ${BD}`, borderRadius: 1.5, bgcolor: PANEL, '&:hover': { borderColor: P, color: P, bgcolor: alpha(P, 0.03) }, '&:disabled': { opacity: 0.3 } }}>
                {b.icon}
              </IconButton>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, bgcolor: PANEL, border: `1px solid ${BD}`, borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', animation: 'pulse-ring 2s infinite', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.67rem', color: MUTED }}>{fullName} · {employeeNumber}</Typography>
          </Box>
        </Box>

        {/* ── HERO CARD ─────────────────────────────────────────────────── */}
        <GlassCard sx={{ mb: 3, animation: 'sectionIn 0.4s ease' }}>
          <Box sx={{ height: 6, background: `linear-gradient(90deg, ${P} 0%, ${S} 55%, ${alpha(P, 0.35)} 100%)` }} />
          <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 3, md: 4 }, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar src={profileSrc} onClick={() => setImageZoomOpen(true)}
                sx={{ width: 90, height: 90, border: `4px solid ${PANEL}`, boxShadow: `0 6px 20px ${alpha(P, 0.22)}`, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.04)' } }}>
                {!profilePicture && <PersonIcon sx={{ color: P, fontSize: 42 }} />}
              </Avatar>
              <input accept="image/*" id="pic-hero" type="file" style={{ display: 'none' }} onChange={handlePicture} />
              <IconButton component="label" htmlFor="pic-hero" size="small"
                sx={{ position: 'absolute', bottom: 2, right: 2, bgcolor: P, color: '#fff', width: 26, height: 26, p: 0, border: `2px solid ${PANEL}`, '&:hover': { bgcolor: P_DARK }, '& .MuiSvgIcon-root': { fontSize: 13 } }}>
                <CameraAltIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.4rem', md: '1.85rem' }, color: P, lineHeight: 1.15, mb: 0.5, letterSpacing: '-0.01em' }}>{fullName}</Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: MUTED, fontWeight: 600, mb: 1.5 }}>
                {person?.agencyEmployeeNum ? `#${person.agencyEmployeeNum}` : '—'}
                {person?.emailAddress ? <>&nbsp;·&nbsp;{person.emailAddress}</> : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {person?.civilStatus && (
                  <Box sx={{ px: 1.5, py: 0.3, bgcolor: alpha(P, 0.07), border: `1px solid ${alpha(P, 0.18)}`, borderRadius: '20px' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: P }}>{person.civilStatus}</Typography>
                  </Box>
                )}
                {person?.bloodType && (
                  <Box sx={{ px: 1.5, py: 0.3, bgcolor: alpha(P, 0.07), border: `1px solid ${alpha(P, 0.18)}`, borderRadius: '20px' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: P }}>Blood Type {person.bloodType}</Typography>
                  </Box>
                )}
                {person?.citizenship && (
                  <Box sx={{ px: 1.5, py: 0.3, bgcolor: alpha(P, 0.07), border: `1px solid ${alpha(P, 0.18)}`, borderRadius: '20px' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: P }}>{person.citizenship}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Tooltip title="Refresh data">
                <IconButton onClick={() => { refreshPerson(); refreshSections(); }}
                  sx={{ width: 38, height: 38, border: `1px solid ${BD}`, borderRadius: 1.5, bgcolor: PANEL, '&:hover': { borderColor: P, color: P } }}>
                  <RefreshIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <Btn startIcon={<EditIcon sx={{ fontSize: 15 }} />} onClick={() => setEditOpen(true)}>Edit Profile</Btn>
            </Box>
          </Box>
        </GlassCard>

        {/* ── Section content card ───────────────────────────────────────── */}
        <GlassCard sx={{ animation: 'sectionIn 0.35s ease 0.05s both' }}>
          <SectionHeader icon={currentNav.icon} title={currentNav.title} subtitle={currentNav.subtitle} />
          <Box sx={{ p: { xs: 2.5, md: 4 } }}>{renderView(activeSection)}</Box>
        </GlassCard>
      </Box>

      {/* ══ RIGHT SIDEBAR ═════════════════════════════════════════════════ */}
      <Box sx={{
        width: SIDEBAR_W, bgcolor: PANEL,
        borderLeft: `2px solid ${alpha(P, 0.28)}`,
        boxShadow: `-3px 0 18px ${alpha(P, 0.05)}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', right: 0, top: 0, height: '100vh',
        overflowY: 'auto', zIndex: 1200,
      }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha(P, 0.1)}`, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, background: `linear-gradient(135deg,${alpha(P, 0.07)} 0%,${alpha(P, 0.01)} 100%)` }}>
          <Box sx={{ width: 36, height: 36, bgcolor: P, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, flexShrink: 0, boxShadow: `0 4px 12px ${alpha(P, 0.4)}` }}>
            <AccountCircleIcon sx={{ fontSize: 19, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '0.88rem', color: P, lineHeight: 1.2 }}>Employee Profile</Typography>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.57rem', color: alpha(P, 0.4), letterSpacing: '0.08em', textTransform: 'uppercase' }}>Personal Data Sheet</Typography>
          </Box>
        </Box>
        <Box sx={{ mx: 2.5, my: 2, p: 2, bgcolor: alpha(P, 0.04), borderRadius: 2, border: `1px solid ${alpha(P, 0.1)}`, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src={profileSrc} sx={{ width: 40, height: 40, border: `2px solid ${PANEL}`, boxShadow: `0 3px 10px ${alpha(P, 0.2)}` }}>
              {!profilePicture && <PersonIcon sx={{ color: P, fontSize: 20 }} />}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '0.8rem', color: P, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: MUTED }}>
                {person?.agencyEmployeeNum ? `#${person.agencyEmployeeNum}` : '—'}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ mx: 2.5, mb: 1.5, px: 2, py: 1.25, bgcolor: alpha(P, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(P, 0.16)}`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: alpha(P, 0.45), textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>Active Section</Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '0.8rem', color: P }}>{currentNav.title}</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', fontWeight: 700, color: alpha(P, 0.32), letterSpacing: '0.14em', textTransform: 'uppercase', px: 3, pb: 0.75, pt: 0.5 }}>Profile Sections</Typography>
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = activeSection === key;
            return (
              <Box key={key} onClick={() => setActiveSection(key)} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, px: 3, py: 1.3, cursor: 'pointer', borderLeft: active ? `3px solid ${P}` : '3px solid transparent', bgcolor: active ? alpha(P, 0.09) : 'transparent', transition: 'all 0.14s ease', '&:hover': { bgcolor: active ? alpha(P, 0.09) : alpha(P, 0.04) } }}>
                <Icon sx={{ fontSize: 15, color: active ? P : alpha(P, 0.35), flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.84rem', fontWeight: active ? 700 : 500, color: active ? P : MUTED, flex: 1 }}>{label}</Typography>
                {active && <KeyboardArrowRightIcon sx={{ fontSize: 13, color: alpha(P, 0.4) }} />}
              </Box>
            );
          })}
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(P, 0.08)}`, flexShrink: 0, bgcolor: alpha(P, 0.013) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIndIcon sx={{ fontSize: 13, color: alpha(P, 0.4) }} />
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: alpha(P, 0.4) }}>Personal Data Sheet | PDS · HRIS</Typography>
          </Box>
        </Box>
      </Box>

      {/* ══ EDIT MODAL ════════════════════════════════════════════════════ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
        <Backdrop open={editOpen} onClick={() => setEditOpen(false)}>
          <Box onClick={e => e.stopPropagation()} sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '92%', maxWidth: 1020, bgcolor: '#f7f8fa', borderRadius: 3,
            boxShadow: '0 25px 60px rgba(0,0,0,0.32)', height: '88vh', maxHeight: 820,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>

            {/* ── MODAL TITLE BAR ── */}
            <Box sx={{
              px: 3, py: 2.5,
              background: `linear-gradient(135deg, ${P} 0%, ${S} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 38, height: 38 }}>
                  <EditIcon sx={{ fontSize: 18, color: '#fff' }} />
                </Avatar>
                <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#fff' }}>Edit Profile</Typography>
              </Box>
              <IconButton onClick={() => setEditOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)', p: 0.5, '&:hover': { color: '#fff' } }}>
                <CloseIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>

            {/* ── BODY ── */}
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* ── LEFT SIDEBAR ── */}
              <Box sx={{
                width: 258, flexShrink: 0, bgcolor: PANEL,
                borderRight: `2px solid ${alpha(P, 0.12)}`,
                display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
              }}>
                <Box sx={{
                  px: 3, py: 2.5,
                  borderBottom: `1px solid ${alpha(P, 0.1)}`,
                  background: `linear-gradient(135deg, ${alpha(P, 0.07)} 0%, ${alpha(P, 0.02)} 100%)`,
                  flexShrink: 0,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.75 }}>
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar src={profileSrc} onClick={() => setEditImgZoom(true)}
                        sx={{ width: 44, height: 44, border: `2px solid ${PANEL}`, boxShadow: `0 3px 10px ${alpha(P, 0.22)}`, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.06)' } }}>
                        {!profilePicture && <PersonIcon sx={{ fontSize: 22, color: P }} />}
                      </Avatar>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.82rem', color: P, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</Typography>
                      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: MUTED }}>
                        {person?.agencyEmployeeNum ? `#${person.agencyEmployeeNum}` : '—'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <input accept="image/*" id="pic-modal" type="file" style={{ display: 'none' }} onChange={handlePicture} />
                    <label htmlFor="pic-modal" style={{ display: 'block' }}>
                      <Btn component="span" sm fullWidth startIcon={<CloudUploadIcon sx={{ fontSize: 13 }} />}>Upload Photo</Btn>
                    </label>
                    <Btn sm outline fullWidth startIcon={<DeleteIcon sx={{ fontSize: 13 }} />} onClick={handleRemovePic}>Remove Photo</Btn>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.6, mt: 1.25, flexWrap: 'wrap' }}>
                    <Chip icon={<PhotoSizeSelectActualIcon sx={{ fontSize: '11px !important' }} />} label="High Quality" size="small" sx={{ bgcolor: alpha(P, 0.08), color: P, fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                    <Chip icon={<CropOriginalIcon sx={{ fontSize: '11px !important' }} />} label="400×400px" size="small" sx={{ bgcolor: SUBTLE, color: MUTED, fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                  </Box>
                </Box>
                <Box sx={{ mx: 2.5, my: 1.75, px: 2, py: 1.1, bgcolor: alpha(P, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(P, 0.16)}`, flexShrink: 0 }}>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.54rem', color: alpha(P, 0.45), textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.25 }}>Editing Section</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: '0.78rem', color: P }}>{currentNav.title}</Typography>
                </Box>
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.54rem', fontWeight: 700, color: alpha(P, 0.32), letterSpacing: '0.14em', textTransform: 'uppercase', px: 3, pb: 0.5 }}>
                  Sections
                </Typography>
                <Box sx={{
                  flex: 1, overflowY: 'auto', pb: 1,
                  '&::-webkit-scrollbar': { width: 3 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: alpha(P, 0.2), borderRadius: 2 },
                }}>
                  {NAV.map(({ key, label, icon: Icon }) => {
                    const active = activeSection === key;
                    return (
                      <Box key={key} onClick={() => setActiveSection(key)} sx={{
                        display: 'flex', alignItems: 'center', gap: 1.75,
                        px: 3, py: 1.25, cursor: 'pointer',
                        borderLeft: active ? `3px solid ${P}` : '3px solid transparent',
                        bgcolor: active ? alpha(P, 0.09) : 'transparent',
                        transition: 'all 0.14s ease',
                        '&:hover': { bgcolor: active ? alpha(P, 0.09) : alpha(P, 0.04) },
                      }}>
                        <Icon sx={{ fontSize: 15, color: active ? P : alpha(P, 0.35), flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: active ? 700 : 500, color: active ? P : MUTED, flex: 1 }}>{label}</Typography>
                        {active && <KeyboardArrowRightIcon sx={{ fontSize: 13, color: alpha(P, 0.4) }} />}
                      </Box>
                    );
                  })}
                </Box>
                <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${alpha(P, 0.08)}`, flexShrink: 0, bgcolor: alpha(P, 0.015) }}>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: alpha(P, 0.38) }}>Personal Data Sheet | PDS · HRIS</Typography>
                </Box>
              </Box>

              {/* ── RIGHT FORM AREA ── */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: PANEL }}>
                <Box sx={{
                  px: 4, py: 2.5,
                  bgcolor: PANEL,
                  borderBottom: `1px solid ${BD}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexShrink: 0,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(P, 0.1), width: 42, height: 42 }}>
                      {React.createElement(currentNav.icon, { sx: { color: P, fontSize: 20 } })}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: P, lineHeight: 1.2 }}>{currentNav.title}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: MUTED }}>{currentNav.subtitle}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <IconButton size="small" disabled={activeSection === 0} onClick={() => setActiveSection(s => s - 1)}
                      sx={{ width: 30, height: 30, border: `1px solid ${BD}`, borderRadius: 1.5, bgcolor: PANEL, '&:hover': { borderColor: P, color: P }, '&:disabled': { opacity: 0.3 } }}>
                      <ArrowBackIosIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                    <IconButton size="small" disabled={activeSection === NAV.length - 1} onClick={() => setActiveSection(s => s + 1)}
                      sx={{ width: 30, height: 30, border: `1px solid ${BD}`, borderRadius: 1.5, bgcolor: PANEL, '&:hover': { borderColor: P, color: P }, '&:disabled': { opacity: 0.3 } }}>
                      <ArrowForwardIosIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Scrollable form body */}
                <Box sx={{
                  flex: 1, overflowY: 'auto', bgcolor: PANEL,
                  px: { xs: 3, md: 4 }, py: { xs: 2.5, md: 3 },
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: alpha(P, 0.15), borderRadius: 2 },
                }}>
                  {renderEdit()}
                </Box>

                {/* Footer actions */}
                <Box sx={{
                  px: 3, py: 2,
                  borderTop: `1px solid ${BD}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  bgcolor: PANEL, flexShrink: 0,
                  boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SaveIcon sx={{ fontSize: 14, color: alpha(P, 0.4) }} />
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: MUTED }}>
                      Changes will be saved to Personal Data Sheet | PDS
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.25 }}>
                    <Btn outline onClick={() => setEditOpen(false)}>Cancel</Btn>
                    <Btn onClick={handleSave} disabled={saving} startIcon={<SaveIcon sx={{ fontSize: 15 }} />}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Btn>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Backdrop>
      </Modal>

      {/* ══ IMAGE ZOOM MODALS ═════════════════════════════════════════════ */}
      {[{ open: imageZoomOpen, onClose: () => setImageZoomOpen(false) }, { open: editImgZoom, onClose: () => setEditImgZoom(false) }].map(({ open, onClose }, mi) => (
        <Modal key={mi} open={open} onClose={onClose} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500, sx: { bgcolor: 'rgba(0,0,0,0.92)' } }}>
          <Backdrop open={open} onClick={onClose}>
            <Box onClick={e => e.stopPropagation()} sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', maxWidth: '90vw', maxHeight: '90vh', outline: 'none' }}>
              <Box sx={{ position: 'relative' }}>
                <Box component="img" src={profileSrc} alt="Profile" sx={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 2, boxShadow: '0 25px 60px rgba(0,0,0,0.5)', objectFit: 'contain', display: 'block' }} />
              
              </Box>
            </Box>
          </Backdrop>
        </Modal>
      ))}

      {/* ══ TOAST ═════════════════════════════════════════════════════════ */}
      {toast.open && (
        <Box sx={{ position: 'fixed', bottom: 28, right: SIDEBAR_W + 16, zIndex: 1500, animation: 'sectionIn 0.25s ease' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.75, bgcolor: '#1e1e2e', border: `1px solid ${alpha(P, 0.3)}`, borderRadius: 2.5, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: 280 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              bgcolor: toast.severity === 'success' ? '#22c55e' : toast.severity === 'error' ? '#ef4444' : '#3b82f6',
              boxShadow: toast.severity === 'success' ? '0 0 8px #22c55e' : toast.severity === 'error' ? '0 0 8px #ef4444' : '0 0 8px #3b82f6' }} />
            <Typography sx={{ fontSize: '0.875rem', color: '#fff', flex: 1, fontWeight: 600 }}>{toast.message}</Typography>
            <IconButton size="small" onClick={() => setToast(p => ({ ...p, open: false }))} sx={{ color: 'rgba(255,255,255,0.4)', p: 0.25, '&:hover': { color: '#fff' } }}><CloseIcon sx={{ fontSize: 13 }} /></IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Profile;