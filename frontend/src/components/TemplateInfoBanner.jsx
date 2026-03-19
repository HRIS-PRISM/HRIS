import React from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

/**
 * TemplateInfoBanner
 * A compact "no-print" banner shown above each PDS page.
 * - Green  → active template loaded; shows version + download button
 * - Yellow → no template activated yet; prompts admin to set one
 *
 * Props:
 *   template        — object from useActiveTemplate (or null)
 *   downloadTemplate — function from useActiveTemplate
 *   loading         — boolean
 */
const TemplateInfoBanner = ({ template, downloadTemplate, loading }) => {
  if (loading) return null;

  const bannerBase = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontFamily: 'Arial, Helvetica, sans-serif',
    borderRadius: '0 0 8px 8px',
    marginBottom: '8px',
  };

  if (!template) {
    return (
      <div
        className="no-print"
        style={{
          ...bannerBase,
          backgroundColor: '#FFF8E1',
          border: '1px solid #FFD54F',
          color: '#5D4037',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <WarningAmberIcon style={{ fontSize: '16px', color: '#F9A825' }} />
          <strong>No active PDS template set.</strong>&nbsp;Go to{' '}
          <em>PDS Template Manager</em> to upload and activate a template.
        </span>
      </div>
    );
  }

  const uploadedDate = template.uploaded_at
    ? new Date(template.uploaded_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
    : '';

  return (
    <div
      className="no-print"
      style={{
        ...bannerBase,
        backgroundColor: '#F0FAF0',
        border: '1px solid #A5D6A7',
        color: '#1B5E20',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <CheckCircleOutlineIcon style={{ fontSize: '16px', color: '#2E7D32' }} />
        <strong>Active Template:</strong>&nbsp;{template.version}&nbsp;
        {uploadedDate && (
          <span style={{ color: '#4CAF50', fontSize: '12px' }}>
            (uploaded {uploadedDate})
          </span>
        )}
        {template.notes && (
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: '#388E3C',
              fontStyle: 'italic',
            }}
          >
            — {template.notes}
          </span>
        )}
      </span>

      <button
        onClick={downloadTemplate}
        title={`Download blank template: ${template.file_name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 14px',
          backgroundColor: '#2E7D32',
          color: '#fff',
          border: 'none',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1B5E20')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2E7D32')}
      >
        <DownloadIcon style={{ fontSize: '15px' }} />
        Download Blank Form
      </button>
    </div>
  );
};

export default TemplateInfoBanner;