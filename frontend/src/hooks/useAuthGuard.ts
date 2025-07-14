import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { isTokenExpired, clearAllTokens } from '../utils/auth';

export const useAuthGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user } = useAuthStore((s) => ({
    accessToken: s.accessToken,
    user: s.user
  }));

  useEffect(() => {
    const publicPaths = ['/login', '/signup', '/forgot-password'];
    const isPublicPath = publicPaths.includes(location.pathname);
    
    // Check if we have valid authentication
    const hasValidAuth = accessToken && user && !isTokenExpired(accessToken);
    
    if (!hasValidAuth) {
      // Clear any invalid tokens
      if (accessToken && isTokenExpired(accessToken)) {
        console.warn('Token expired, clearing auth state');
        clearAllTokens();
        useAuthStore.getState().logout();
      }
      
      // Redirect to login if not on a public path
      if (!isPublicPath) {
        console.log('No valid auth, redirecting to login');
        navigate('/login', { replace: true });
      }
    } else if (hasValidAuth && isPublicPath) {
      // Redirect authenticated users away from public pages
      console.log('User authenticated, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [accessToken, user, location.pathname, navigate]);

  return {
    isAuthenticated: !!(accessToken && user && !isTokenExpired(accessToken)),
    isLoading: false
  };
};
