import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import { getAuthHeaders } from '../utils/auth';

/**
 * useActiveTemplate
 * Fetches the currently active PDS template from the PDSTemplates system.
 * Returns version label, metadata, and a download helper so PDS1–4
 * can display the dynamic version string and offer the blank form download.
 */
const useActiveTemplate = () => {
  const [template, setTemplate] = useState(null);   // full template row
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchActive = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/pds-templates/active`,
          getAuthHeaders()
        );
        if (!cancelled) {
          setTemplate(res.data.template || null);
        }
      } catch (err) {
        if (!cancelled) {
          // 404 just means no template has been activated yet — not a hard error
          if (err.response?.status === 404) {
            setTemplate(null);
          } else {
            console.error('useActiveTemplate: fetch error', err);
            setError('Could not load active template.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActive();
    return () => { cancelled = true; };
  }, []);

  /**
   * downloadTemplate — triggers a browser download of the active template file.
   * Works the same way as PDSTemplates.jsx's handleDownload.
   */
  const downloadTemplate = async () => {
    if (!template) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/pds-templates/${template.id}/download`,
        { ...getAuthHeaders(), responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', template.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('useActiveTemplate: download error', err);
    }
  };

  return {
    template,          // { id, file_name, version, uploaded_at, file_size, notes }
    loading,
    error,
    versionLabel: template?.version ?? 'Revised 2025',   // fallback keeps UI safe
    downloadTemplate,
  };
};

export default useActiveTemplate;