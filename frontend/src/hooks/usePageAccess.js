import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';
import { getAuthHeaders, getUserInfo } from '../utils/auth';
import { isPageAccessActive } from '../utils/pageAccessUtils';

/**
 * Custom hook for dynamic page access checking
 * 
 * This hook automatically fetches the page ID from the backend based on a component identifier
 * (route path or component name) and checks if the current user has access to that page.
 * 
 * @param {string} componentIdentifier - The component identifier (e.g., 'pds1', 'registration', 'users-list')
 *                                       This should match the component_identifier in the pages table
 * @param {Object} options - Optional configuration
 * @param {boolean} options.autoCheck - Whether to automatically check access on mount (default: true)
 * @param {string} options.employeeNumber - Override employee number (default: from localStorage)
 * 
 * @returns {Object} - { hasAccess, pageId, loading, error }
 *   - hasAccess: boolean | null - true if user has access, false if denied, null if still checking
 *   - pageId: number | null - The page ID from the database
 *   - loading: boolean - Whether the access check is in progress
 *   - error: string | null - Error message if something went wrong
 * 
 * @example
 * // In a component
 * const { hasAccess, loading } = usePageAccess('pds1');
 * 
 * if (loading) return <Loading />;
 * if (!hasAccess) return <AccessDenied />;
 * 
 * return <YourComponent />;
 */
const usePageAccess = (componentIdentifier, options = {}) => {
  const { autoCheck = true, employeeNumber: overrideEmployeeNumber } = options;
  const location = useLocation();
  
  const [hasAccess, setHasAccess] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!autoCheck || !componentIdentifier) {
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      setLoading(true);
      setError(null);
      setHasAccess(null);

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
          setHasAccess(false);
          setError('No employee number found');
          setLoading(false);
          return;
        }

        const authHeaders = getAuthHeaders();

        // Step 1: Get page ID by component identifier
        const pageResponse = await fetch(
          `${API_BASE_URL}/pages/by-identifier/${componentIdentifier}`,
          {
            method: 'GET',
            ...authHeaders,
          }
        );

        if (!pageResponse.ok) {
          if (pageResponse.status === 404) {
            setError(`Page not found for identifier: ${componentIdentifier}`);
            setHasAccess(false);
          } else if (pageResponse.status === 401 || pageResponse.status === 403) {
            setError('Unauthorized while fetching page information');
            setHasAccess(false);
          } else {
            setError('Failed to fetch page information');
            setHasAccess(null);
          }
          setLoading(false);
          return;
        }

        const pageData = await pageResponse.json();
        const fetchedPageId = pageData.id;
        setPageId(fetchedPageId);

        // Step 2: Check if user has access to this page
        const accessResponse = await fetch(
          `${API_BASE_URL}/page_access/${userId}`,
          {
            method: 'GET',
            ...authHeaders,
          }
        );

        if (!accessResponse.ok) {
          if (accessResponse.status === 401 || accessResponse.status === 403) {
            setError('Unauthorized while fetching page access');
            setHasAccess(false);
          } else {
            setError('Failed to fetch page access');
            setHasAccess(null);
          }
          setLoading(false);
          return;
        }

        const accessData = await accessResponse.json();
        const accessArray = Array.isArray(accessData)
          ? accessData
          : accessData.data || [];

        // Check if page_privilege indicates any level of access (not "0" or empty)
        // Privileges like "1", "12", "2", etc. all indicate access
        const hasPageAccess = accessArray.some(
          (access) =>
            Number(access.page_id) === Number(fetchedPageId) &&
            isPageAccessActive(access),
        );

        setHasAccess(hasPageAccess);
      } catch (err) {
        console.error('Error checking page access:', err);
        setError('Network error occurred while checking access');
        setHasAccess(null);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();

    const onPageAccessUpdated = () => {
      checkAccess();
    };
    window.addEventListener('pageAccessUpdated', onPageAccessUpdated);
    return () => {
      window.removeEventListener('pageAccessUpdated', onPageAccessUpdated);
    };
  }, [componentIdentifier, autoCheck, overrideEmployeeNumber, location.pathname]);

  return { hasAccess, pageId, loading, error };
};

export default usePageAccess;


