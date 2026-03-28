import { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';
import { getAuthHeaders, getUserInfo } from '../utils/auth';

/**
 * Custom hook for checking multiple page accesses at once
 *
 * This hook fetches all page access for the current user and provides
 * a function to check if a user has access to a specific component identifier.
 *
 * @param {string[]} componentIdentifiers - Array of component identifiers to check
 * @param {Object} options - Optional configuration
 * @param {string} options.employeeNumber - Override employee number (default: from localStorage)
 *
 * @returns {Object} - { hasAccess, loading, error, checkAccess }
 *   - hasAccess: function(identifier) - Returns true if user has access to the identifier
 *   - loading: boolean - Whether the access check is in progress
 *   - error: string | null - Error message if something went wrong
 *   - accessMap: Object - Map of component identifier to page ID
 *
 * @example
 * const { hasAccess, loading } = usePageAccesses(['pds1', 'pds2', 'registration']);
 *
 * if (loading) return <Loading />;
 * if (!hasAccess('pds1')) return <AccessDenied />;
 */
const usePageAccesses = (componentIdentifiers = [], options = {}) => {
  const { employeeNumber: overrideEmployeeNumber } = options;

  const [accessMap, setAccessMap] = useState({}); // Maps component identifier -> page ID -> hasAccess
  const [pageIdMap, setPageIdMap] = useState({}); // Maps component identifier -> page ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!componentIdentifiers || componentIdentifiers.length === 0) {
      setLoading(false);
      return;
    }

    const fetchAccesses = async () => {
      setLoading(true);
      setError(null);

      try {
        const tokenUser = getUserInfo();
        const tokenEmployeeNumber = tokenUser?.employeeNumber || '';
        const storedEmployeeNumber = localStorage.getItem('employeeNumber') || '';

        // Keep auth identity stable even if a page previously wrote a search employee number.
        if (tokenEmployeeNumber && tokenEmployeeNumber !== storedEmployeeNumber) {
          localStorage.setItem('employeeNumber', tokenEmployeeNumber);
        }

        const userId =
          overrideEmployeeNumber || tokenEmployeeNumber || storedEmployeeNumber;

        if (!userId) {
          setError('No employee number found');
          setLoading(false);
          return;
        }

        const authHeaders = getAuthHeaders();

        // Step 1: Get all pages to filter out non-existent identifiers
        const pagesResponse = await fetch(`${API_BASE_URL}/pages`, {
          method: 'GET',
          ...authHeaders,
        });

        if (!pagesResponse.ok) {
          setError('Failed to fetch pages');
          setLoading(false);
          return;
        }

        const allPages = await pagesResponse.json();
        const pagesArray = Array.isArray(allPages)
          ? allPages
          : allPages.data || [];

        // Create a map of component_identifier -> page_id for existing pages
        const existingPagesMap = {};
        pagesArray.forEach((page) => {
          if (page.component_identifier) {
            existingPagesMap[page.component_identifier] = page.id;
          }
        });

        // Step 2: Filter identifiers to only those that exist, and build pageIdMap
        const newPageIdMap = {};
        componentIdentifiers.forEach((identifier) => {
          if (existingPagesMap[identifier]) {
            newPageIdMap[identifier] = existingPagesMap[identifier];
          }
        });
        setPageIdMap(newPageIdMap);

        // Step 3: Get all page access for the user
        const accessResponse = await fetch(
          `${API_BASE_URL}/page_access/${userId}`,
          {
            method: 'GET',
            ...authHeaders,
          },
        );

        if (!accessResponse.ok) {
          if (accessResponse.status === 401 || accessResponse.status === 403) {
            setError('Unauthorized while fetching page access');
          } else {
            setError('Failed to fetch page access');
          }
          setLoading(false);
          return;
        }

        const accessData = await accessResponse.json();
        const accessArray = Array.isArray(accessData)
          ? accessData
          : accessData.data || [];

        // Step 4: Build access map
        const newAccessMap = {};
        componentIdentifiers.forEach((identifier) => {
          const pageId = newPageIdMap[identifier];
          if (pageId) {
            const hasPageAccess = accessArray.some((access) => {
              if (access.page_id === pageId) {
                const privilege = String(access.page_privilege || '0');
                return privilege !== '0' && privilege !== '';
              }
              return false;
            });
            newAccessMap[identifier] = hasPageAccess;
          } else {
            newAccessMap[identifier] = false;
          }
        });

        setAccessMap(newAccessMap);
      } catch (err) {
        console.error('Error checking page accesses:', err);
        setError('Network error occurred while checking access');
      } finally {
        setLoading(false);
      }
    };

    fetchAccesses();
  }, [
    componentIdentifiers.join(','),
    overrideEmployeeNumber,
    options?.pageAccessVersion,
  ]);

  const hasAccess = (identifier) => {
    return accessMap[identifier] === true;
  };

  return { hasAccess, loading, error, accessMap, pageIdMap };
};

export default usePageAccesses;
