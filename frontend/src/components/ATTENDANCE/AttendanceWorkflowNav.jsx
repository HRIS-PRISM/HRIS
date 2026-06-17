import React from 'react';
import { Box, Button } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentBorder: 'rgba(109,35,35,0.14)',
};

const AttendanceWorkflowNav = ({
  prevStep,
  nextStep,
  onPrevious,
  onNext,
  inline = false,
}) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.75,
      alignItems: 'center',
      flexShrink: 0,
      ...(inline ? {} : { mb: 1.5 }),
    }}
  >
    <Button
      size="small"
      variant="outlined"
      startIcon={<ArrowBack sx={{ fontSize: '15px !important' }} />}
      onClick={onPrevious}
      disabled={!prevStep}
      sx={{
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.74rem',
        minWidth: 72,
        borderColor: T.accentBorder,
        color: T.accent,
        bgcolor: '#fff',
        '&:hover': { bgcolor: alpha(T.accent, 0.06), borderColor: T.accent },
        '&.Mui-disabled': { opacity: 0.45 },
      }}
    >
      Back
    </Button>
    <Button
      size="small"
      variant="contained"
      endIcon={<ArrowForward sx={{ fontSize: '15px !important' }} />}
      onClick={onNext}
      disabled={!nextStep}
      sx={{
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.74rem',
        minWidth: 72,
        bgcolor: T.accent,
        color: '#fff',
        boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
        '&:hover': { bgcolor: T.accentDark },
        '&.Mui-disabled': { bgcolor: alpha(T.accent, 0.35), color: '#fff' },
      }}
    >
      Next
    </Button>
  </Box>
);

export default AttendanceWorkflowNav;
