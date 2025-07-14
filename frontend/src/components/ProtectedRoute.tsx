import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { isTokenExpired, clearAllTokens } from '../utils/auth';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { accessToken, user } = useAuthStore((s) => ({ 
    accessToken: s.accessToken, 
    user: s.user 
  }));

  // Clear expired tokens automatically
  useEffect(() => {
    if (accessToken && isTokenExpired(accessToken)) {
      console.warn('Token expired in ProtectedRoute, clearing auth state');
      clearAllTokens();
      useAuthStore.getState().logout();
    }
  }, [accessToken]);

  // If no token or user found, return null (let AuthWrapper handle navigation)
  if (!accessToken || !user) {
    return null;
  }

  // If token is expired, return null (let AuthWrapper handle navigation)
  if (isTokenExpired(accessToken)) {
    return null;
  }

  return children;
};

export default ProtectedRoute;
