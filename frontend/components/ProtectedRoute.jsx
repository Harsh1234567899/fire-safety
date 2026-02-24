import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Lock } from 'lucide-react';

/**
 * ProtectedRoute - wraps routes that need auth + role checks.
 * 
 * Props:
 *  - allowedRoles: string[] of allowed roles (e.g. ['admin', 'manager'])
 *  - children: the route component to render
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
    const { user } = useSelector(state => state.auth);

    // Not logged in → redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role check
    const userRole = user.role?.toLowerCase();
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return <AccessDenied />;
    }

    return children;
};

const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-full bg-white rounded-[2.5rem] border border-gray-100 p-12 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
            <Lock size={36} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privileged Module</h2>
        <p className="text-gray-500 max-w-md">Your current system authorization level does not permit access to this sector. Please contact your Global Controller for clearance.</p>
    </div>
);

export default ProtectedRoute;
