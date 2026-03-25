import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useActiveTemplate from '../../hooks/useActiveTemplate';
import { getVersionKey } from '../../utils/pdsVersionUtils';

// ── Version imports — add new versions here only ──────────────────────────────
import PDS1_2017 from './versions/PDS1_2017';
import PDS1_2025 from './versions/PDS1_2025';

const VERSION_MAP = {
  '2025': PDS1_2025,
  '2017': PDS1_2017,
  // '2030': PDS1_2030,  ← just add future versions here
};

const PDS1 = () => {
  const { versionLabel, loading } = useActiveTemplate();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
        <Typography sx={{ color: '#6d2323' }}>Loading PDS form...</Typography>
      </Box>
    );
  }

  const versionKey = getVersionKey(versionLabel);
  const VersionComponent = VERSION_MAP[versionKey] || PDS1_2017;

  return <VersionComponent />;
};

export default PDS1;