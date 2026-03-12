import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useActiveTemplate from '../../hooks/useActiveTemplate';
import { getVersionKey } from '../../utils/pdsVersionUtils';

import PDS4_2017 from './versions/PDS4_2017';
import PDS4_2025 from './versions/PDS4_2025';

const VERSION_MAP = {
  '2025': PDS4_2025,
  '2017': PDS4_2017,
};

const PDS4 = () => {
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
  const VersionComponent = VERSION_MAP[versionKey] || PDS4_2017;

  return <VersionComponent />;
};

export default PDS4;