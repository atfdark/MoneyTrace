import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const defaultRedirect = location.pathname.startsWith('/customer') ? '/customer/login' : '/login';
    return <Navigate to={redirectTo || defaultRedirect} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && user) {
    const userRole = (user.role || '').toLowerCase();
    const isAllowed = allowedRoles.map(r => r.toLowerCase()).includes(userRole);

    if (!isAllowed) {
      if (userRole === 'customer') {
        return <Navigate to="/customer/home" replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;