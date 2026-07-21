import React from 'react';
import { Box } from '@mui/material';
import AttendanceModuleNonTeachingStaff from './AttendanceModuleNonTeaching';
import AttendanceModuleFaculty from './AttendanceModuleFaculty30hrs';
import AttendanceModuleFacultyDesignated from './AttendanceModuleFacultyDesignated';

const DRAWER_MODULES = {
  nonTeaching: {
    Component: AttendanceModuleNonTeachingStaff,
    title: 'Non-Teaching Computation',
  },
  faculty30: {
    Component: AttendanceModuleFaculty,
    title: 'Faculty 30hrs Computation',
  },
  facultyDesignated: {
    Component: AttendanceModuleFacultyDesignated,
    title: 'Designated Computation',
  },
};

const AttendanceComputationDrawer = ({
  drawerKey,
  initialContext,
  saveSignal = 0,
  onClose,
  onSavedToSummary,
}) => {
  const cfg = DRAWER_MODULES[drawerKey];
  if (!cfg) return null;
  const { Component } = cfg;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          '& > div > div': {
            left: '0 !important',
            transform: 'none !important',
            width: '100% !important',
            maxWidth: '100% !important',
          },
        }}
      >
        <Component
          key={`${drawerKey}-${initialContext?.employeeNumber || ''}-${initialContext?.startDate || ''}`}
          embedded
          initialContext={initialContext}
          saveSignal={saveSignal}
          onClose={onClose}
          onSavedToSummary={onSavedToSummary}
        />
      </Box>
    </Box>
  );
};

export default AttendanceComputationDrawer;
