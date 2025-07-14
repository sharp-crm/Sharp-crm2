// components/AuthWrapper.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { isTokenExpired, clearAllTokens } from '../utils/auth';

const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialize, accessToken, user, logout } = useAuthStore((s) => ({
    initialize: s.initializeFromSession,
    accessToken: s.accessToken,
    user: s.user,
    logout: s.logout
  }));
  const [hydrated, setHydrated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const initialized = useRef(false);

  // Initialize auth state from storage
  useEffect(() => {
    if (!initialized.current) {
      initialize();
      initialized.current = true;
      // Add a small delay to ensure state is fully updated
      setTimeout(() => setHydrated(true), 10);
    }
  }, [initialize]);

  // Handle authentication and routing
  useEffect(() => {
    if (!hydrated) return;

    const publicPaths = ['/login', '/signup', '/forgot-password'];
    const isPublicPath = publicPaths.includes(location.pathname);

    // Check if we have a valid token and user
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
  }, [hydrated, accessToken, user, location.pathname, navigate]);

  // Show loading spinner while initializing
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;
