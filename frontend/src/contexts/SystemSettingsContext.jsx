import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';

// Default settings
const defaultSettings = {
  primaryColor: '#894444',
  secondaryColor: '#6d2323',
  accentColor: '#FEF9E1',
  textColor: '#FFFFFF',
  textPrimaryColor: '#6D2323',
  textSecondaryColor: '#FEF9E1',
  hoverColor: '#6D2323',
  backgroundColor: '#FFFFFF',
  institutionLogo: '',
  hrisLogo: '',
  institutionName: 'Eulogio "Amang" Rodriguez Institute of Science and Technology',
  systemName: 'Human Resource Information System',
  institutionAbbreviation: 'EARIST',
  footerText: '© 2025 EARIST Manila - Human Resource Information System. All rights Reserved.',
  copyrightSymbol: '©',
  enableWatermark: true,
  // CRUD Button Colors
  createButtonColor: '#6d2323',
  createButtonHoverColor: '#a31d1d',
  readButtonColor: '#6d2323',
  readButtonHoverColor: '#a31d1d',
  updateButtonColor: '#6d2323',
  updateButtonHoverColor: '#a31d1d',
  deleteButtonColor: '#6d2323',
  deleteButtonHoverColor: '#a31d1d',
  cancelButtonColor: '#6c757d',
  cancelButtonHoverColor: '#5a6268',
};

const SystemSettingsContext = createContext({
  settings: defaultSettings,
  updateSettings: () => {},
  refreshSettings: () => {},
});

export const SystemSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage first (for instant display)
  useEffect(() => {
    const localSettings = localStorage.getItem('systemSettings');
    if (localSettings) {
      try {
        const parsed = JSON.parse(localSettings);
        // Merge with defaults to ensure all CRUD button colors are present
        const mergedSettings = {
          ...defaultSettings,
          ...parsed,
        };
        setSettings(mergedSettings);
        
        // Set CSS variables
        document.documentElement.style.setProperty(
          '--background-color',
          parsed.backgroundColor || '#FFFFFF'
        );
      } catch (error) {
        console.error('Error parsing local settings:', error);
      }
    }
  }, []);

  // Fetch settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api')
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;

        const response = await axios.get(url);
        const fetchedSettings = response.data;
        
        // Merge with defaults to ensure all CRUD button colors are present
        const mergedSettings = {
          ...defaultSettings,
          ...fetchedSettings,
        };
        
        setSettings(mergedSettings);
        localStorage.setItem('systemSettings', JSON.stringify(mergedSettings));

        // Set CSS variables
        document.documentElement.style.setProperty(
          '--background-color',
          fetchedSettings.backgroundColor || '#FFFFFF'
        );
      } catch (error) {
        console.error('Error loading system settings:', error);
        // Keep using local settings or defaults if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Update settings when localStorage changes (e.g., from SystemSettings page)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'systemSettings') {
        try {
          const newSettings = JSON.parse(e.newValue);
          // Merge with defaults to ensure all CRUD button colors are present
          const mergedSettings = {
            ...defaultSettings,
            ...newSettings,
          };
          setSettings(mergedSettings);
          
          document.documentElement.style.setProperty(
            '--background-color',
            mergedSettings.backgroundColor || '#FFFFFF'
          );
        } catch (error) {
          console.error('Error parsing updated settings:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event (for same-tab updates)
    const handleCustomStorageChange = () => {
      const localSettings = localStorage.getItem('systemSettings');
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          // Merge with defaults to ensure all CRUD button colors are present
          const mergedSettings = {
            ...defaultSettings,
            ...parsed,
          };
          setSettings(mergedSettings);
          
          document.documentElement.style.setProperty(
            '--background-color',
            mergedSettings.backgroundColor || '#FFFFFF'
          );
        } catch (error) {
          console.error('Error parsing updated settings:', error);
        }
      }
    };

    window.addEventListener('systemSettingsUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('systemSettingsUpdated', handleCustomStorageChange);
    };
  }, []);

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('systemSettingsUpdated'));
    
    document.documentElement.style.setProperty(
      '--background-color',
      newSettings.backgroundColor || '#FFFFFF'
    );
  };

  const refreshSettings = async () => {
    try {
      const url = API_BASE_URL.includes('/api')
        ? `${API_BASE_URL}/system-settings`
        : `${API_BASE_URL}/api/system-settings`;

      const response = await axios.get(url);
      const fetchedSettings = response.data;
      
      updateSettings(fetchedSettings);
    } catch (error) {
      console.error('Error refreshing system settings:', error);
    }
  };

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        refreshSettings,
        loading,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  }
  return context;
};

export default SystemSettingsContext;




