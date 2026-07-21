/**
 * Authentication Utility Functions
 * 
 * Centralized functions for handling authentication tokens and headers
 * across all components. This ensures consistent token handling and
 * makes it easier to debug authentication issues.
 */

/**
 * Get authentication headers for API requests
 * 
 * @param {Object} options - Optional configuration
 * @param {string} options.contentType - Override Content-Type (default: 'application/json')
 * @param {boolean} options.includeContentType - Whether to include Content-Type header (default: true)
 * 
 * @returns {Object} Headers object with Authorization and optionally Content-Type
 * 
 * @example
 * // Standard JSON request
 * const headers = getAuthHeaders();
 * axios.get('/api/endpoint', headers);
 * 
 * @example
 * // POST request
 * axios.post('/api/endpoint', data, getAuthHeaders());
 * 
 * @example
 * // File upload (don't set Content-Type, let browser set it with boundary)
 * axios.post('/api/upload', formData, getAuthHeaders({ includeContentType: false }));
 */
export const getAuthHeaders = (options = {}) => {
  const { contentType = 'application/json', includeContentType = true } = options;
  const token = localStorage.getItem('token');

  if (!token || token === 'null' || token === 'undefined') {
    console.warn('⚠️ No authentication token found in localStorage');
    const headers = {};
    if (includeContentType) {
      headers['Content-Type'] = contentType;
    }
    return { headers };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (includeContentType) {
    headers['Content-Type'] = contentType;
  }

  return { headers };
};

/**
 * Check if user has a valid token
 * 
 * @returns {boolean} True if token exists, false otherwise
 */
export const hasToken = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Get token from localStorage
 * 
 * @returns {string|null} The token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Decode JWT token to get user information
 * 
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const decodeToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get user information from token
 * 
 * @returns {Object} User info with employeeNumber, username, role, etc.
 */
export const getUserInfo = () => {
  const decoded = decodeToken();
  if (!decoded) return {};
  
  return {
    employeeNumber: decoded.employeeNumber,
    username: decoded.username,
    role: decoded.role,
    ...decoded, // Include any other fields from the token
  };
};

/**
 * Clear authentication token (logout)
 */
export const clearAuth = () => {
  localStorage.removeItem('token');
  console.log('🔒 Authentication token cleared');
};

