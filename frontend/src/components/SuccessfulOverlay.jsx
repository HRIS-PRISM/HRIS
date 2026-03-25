import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const SuccessfulOverlay = ({ open, action, onClose, showOkButton = false }) => {
  useEffect(() => {
    if (open && !showOkButton) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, showOkButton, onClose]);

  if (!open) return null;

  const getMessage = () => {
    switch (action) {
      case 'create': return 'Successfully Created!';
      case 'edit': return 'Successfully Edited!';
      case 'delete': return 'Successfully Deleted!';
      case 'send': return 'Successfully Sent!';
      case 'download': return 'Successfully Downloaded!';
      case 'gmail': return 'Successfully Sent to Gmail!';
      case 'reset': return 'Successfully Reset!';
      case 'bulk': return 'Successfully Updated!';
      case 'status': return 'Status Updated!';
      case 'cancel': return 'Successfully Cancelled!';
      default: return 'Successful!';
    }
  };

  // Generate floating molecules
  const generateMolecules = (count, color, sizeRange = [5, 15]) => {
    return [...Array(count)].map((_, i) => {
      const size = Math.floor(Math.random() * (sizeRange[1] - sizeRange[0])) + sizeRange[0];
      const top = Math.random() * 80 + 10;
      const left = Math.random() * 80 + 10;
      return (
        <Box
          key={`${color}-${i}`}
          sx={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            bgcolor: color,
            top: `${top}%`,
            left: `${left}%`,
            filter: 'blur(3px)',
            animation: `float${i} ${4 + i}s ease-in-out infinite alternate`,
          }}
        />
      );
    });
  };

  return createPortal(
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Red/maroon molecules */}
      {generateMolecules(6, 'rgba(163,29,29,0.6)')}
      {/* Light/cream molecules */}
      {generateMolecules(6, 'rgba(255,248,225,0.6)', [3, 10])}

      {/* Glowing box */}
      <Box
        sx={{
          bgcolor: 'rgba(112,0,0,0.9)',
          borderRadius: 4,
          px: 6,
          py: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: `
            0 0 15px rgba(163,29,29,0.6),
            0 0 30px rgba(163,29,29,0.4),
            0 0 50px rgba(255,248,225,0.2)
          `,
          border: '2px solid rgba(255, 248, 225, 0.3)',
          animation: 'fadeInOverlay 0.6s ease-out',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <CheckCircleIcon
          sx={{
            fontSize: 100,
            color: '#FFF8E1',
            mb: 2,
            animation: 'popIn 0.6s ease-out',
            filter: 'drop-shadow(0 0 15px #A31D1D) drop-shadow(0 0 8px #FFF8E1)',
          }}
        />
        <Typography
          variant="h6"
          sx={{
            color: '#FFF8E1',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'fadeIn 0.8s ease-in-out',
            mb: showOkButton ? 3 : 0,
          }}
        >
          {getMessage()}
        </Typography>
        {showOkButton && (
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              bgcolor: '#A31D1D',
              color: '#FFFFFF',
              fontWeight: 'bold',
              px: 6,
              py: 1.5,
              minWidth: '200px',
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              boxShadow: '0 4px 14px rgba(163, 29, 29, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              '&:hover': {
                bgcolor: '#700000',
                boxShadow: '0 6px 20px rgba(163, 29, 29, 0.6)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
              animation: 'fadeIn 1s ease-in-out',
            }}
          >
            OK
          </Button>
        )}
      </Box>

      <style>
        {`
          @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }

          @keyframes fadeInOverlay {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }

          @keyframes float0 { 0% { transform: translateY(0); } 100% { transform: translateY(-15px); } }
          @keyframes float1 { 0% { transform: translateY(0); } 100% { transform: translateY(-20px); } }
          @keyframes float2 { 0% { transform: translateY(0); } 100% { transform: translateY(-25px); } }
          @keyframes float3 { 0% { transform: translateY(0); } 100% { transform: translateY(-18px); } }
          @keyframes float4 { 0% { transform: translateY(0); } 100% { transform: translateY(-22px); } }
          @keyframes float5 { 0% { transform: translateY(0); } 100% { transform: translateY(-17px); } }
        `}
      </style>
    </Box>,
    document.body
  );
};

export default SuccessfulOverlay;
