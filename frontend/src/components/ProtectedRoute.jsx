import React from 'react';
import { Navigate } from 'react-router-dom';
import { normalizeRole } from './GatedPageRoute';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        return <Navigate to="/" />;
    }

    try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const userRole = normalizeRole(decoded.role);
        const allowed = (allowedRoles || []).map(normalizeRole);

        if (allowed.includes(userRole)) {
            return children;
        }

        return <Navigate to="/access-denied" replace />;
    } catch (error) {
        console.error('Error decoding token:', error);
        return <Navigate to="/" />;
    }
};

export default ProtectedRoute;
