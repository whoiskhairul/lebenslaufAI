import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
}) => {
  const { isAuthenticated } = useAuthStore();

  if (requireAuth && !isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    window.location.href = '/dashboard';
    return null;
  }

  return <>{children}</>;
};
