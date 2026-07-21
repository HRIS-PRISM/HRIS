import { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../apiConfig';
import { getAuthHeaders, getUserInfo } from '../utils/auth';
import { componentMapping, getCategoryIcon } from '../utils/componentMapping';
import { useSocket } from '../contexts/SocketContext';
import React from 'react';

/**
 * Custom hook for dynamic sidebar menu generation
 * 
 * Features:
 * - Fetches accessible pages from backend based on user's page_access
 * - Groups pages by category (page_description)
 * - Maps icons from componentMapping
 * - Listens to Socket.IO for real-time updates
 * - Auto-refreshes when access is granted/revoked
 * 
 * @returns {Object} { menuStructure, loading, error, refetch }
 */
const useDynamicSidebar = () => {
  const [menuStructure, setMenuStructure] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, connected } = useSocket();

  /**
   * Fetch accessible pages for current user
   */
  const fetchAccessiblePages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const tokenUser = getUserInfo();
      const tokenEmployeeNumber = tokenUser?.employeeNumber || '';
      const storedEmployeeNumber = localStorage.getItem('employeeNumber') || '';

      if (tokenEmployeeNumber && tokenEmployeeNumber !== storedEmployeeNumber) {
        localStorage.setItem('employeeNumber', tokenEmployeeNumber);
      }

      const employeeNumber = tokenEmployeeNumber || storedEmployeeNumber;
      if (!employeeNumber) {
        setError('No employee number found');
        setLoading(false);
        return;
      }

      const authHeaders = getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/pages/accessible/${employeeNumber}`,
        {
          method: 'GET',
          ...authHeaders,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch accessible pages: ${response.status}`);
      }

      const accessiblePages = await response.json();
      console.log('Accessible pages fetched:', accessiblePages);

      // Structure pages by category
      const structured = structureMenuByCategory(accessiblePages);
      setMenuStructure(structured);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching accessible pages:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  /**
   * Structure pages into categories with icons
   * @param {Array} pages - Array of accessible pages
   * @returns {Object} Structured menu by category
   */
  const structureMenuByCategory = (pages) => {
    const structure = {};

    pages.forEach((page) => {
      const category = page.page_description || 'General';
      const componentId = page.component_identifier;
      
      if (!structure[category]) {
        structure[category] = {
          categoryName: category,
          categoryIcon: getCategoryIcon(category),
          items: [],
        };
      }

      // Get component info and icon
      const componentInfo = componentMapping[componentId] || {};
      const Icon = componentInfo.icon;

      structure[category].items.push({
        id: page.id,
        name: page.page_name,
        route: page.page_url || componentInfo.routePath || '#',
        icon: Icon ? React.createElement(Icon) : null,
        componentIdentifier: componentId,
        privilege: page.page_privilege,
      });
    });

    // Sort items within each category alphabetically
    Object.keys(structure).forEach((category) => {
      structure[category].items.sort((a, b) => a.name.localeCompare(b.name));
    });

    return structure;
  };

  /**
   * Handle Socket.IO page access granted event
   */
  const handlePageAccessGranted = useCallback((data) => {
    console.log('✓ Page access granted (Socket.IO):', data);
    // Refetch to get updated menu
    fetchAccessiblePages();
  }, [fetchAccessiblePages]);

  /**
   * Handle Socket.IO page access revoked event
   */
  const handlePageAccessRevoked = useCallback((data) => {
    console.log('✗ Page access revoked (Socket.IO):', data);
    // Refetch to get updated menu
    fetchAccessiblePages();
  }, [fetchAccessiblePages]);

  // Initial fetch on mount
  useEffect(() => {
    fetchAccessiblePages();
  }, [fetchAccessiblePages]);

  // Listen for Socket.IO events
  useEffect(() => {
    if (!socket || !connected) return;

    console.log('useDynamicSidebar: Subscribing to Socket.IO events');

    socket.on('pageAccessGranted', handlePageAccessGranted);
    socket.on('pageAccessRevoked', handlePageAccessRevoked);

    // Cleanup listeners on unmount
    return () => {
      console.log('useDynamicSidebar: Unsubscribing from Socket.IO events');
      socket.off('pageAccessGranted', handlePageAccessGranted);
      socket.off('pageAccessRevoked', handlePageAccessRevoked);
    };
  }, [socket, connected, handlePageAccessGranted, handlePageAccessRevoked]);

  return {
    menuStructure,
    loading,
    error,
    refetch: fetchAccessiblePages,
  };
};

export default useDynamicSidebar;
