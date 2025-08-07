// components/AuthWrapper.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { isTokenExpired, clearAllTokens } from '../utils/auth';
import { isTokenValid } from '../utils/token';
import authService from '../services/authService';

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
      // Double-check storage directly before proceeding
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      const storedToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      console.log('🔄 AuthWrapper initializing:', {
        hasStoredUser: !!storedUser,
        hasStoredToken: !!storedToken,
        tokenLength: storedToken?.length
      });
      
      initialize();
      initialized.current = true;
      
      // Give more time for state restoration, especially if we have stored data
      const delay = (storedUser && storedToken) ? 150 : 50;
      setTimeout(() => {
        console.log('⏰ Setting hydrated after', delay, 'ms');
        setHydrated(true);
      }, delay);
    }
  }, [initialize]);

  // Handle authentication and routing
  useEffect(() => {
    if (!hydrated) return;

    const publicPaths = ['/login', '/signup', '/forgot-password'];
    const isPublicPath = publicPaths.includes(location.pathname);

    // Enhanced auth check - check both store state AND storage directly
    const storeHasAuth = !!(accessToken && user);
    const storageHasAuth = !!(
      (localStorage.getItem('user') || sessionStorage.getItem('user')) &&
      (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))
    );
    
    // If store doesn't have auth but storage does, try to reinitialize
    if (!storeHasAuth && storageHasAuth) {
      console.log('🔄 Store empty but storage has data, reinitializing...');
      initialize();
      return; // Let the next render handle the routing
    }

    // Validate token
    const tokenToCheck = accessToken || localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const tokenValidation = tokenToCheck ? isTokenValid(tokenToCheck) : false;
    const hasValidAuth = storeHasAuth && tokenValidation;

    console.log('🎯 Auth check result:', {
      storeHasAuth,
      storageHasAuth, 
      tokenValid: tokenValidation,
      hasValidAuth,
      isPublicPath,
      currentPath: location.pathname
    });

    if (!hasValidAuth) {
      // Clear any invalid tokens
      if (tokenToCheck && !tokenValidation) {
        console.warn('Token invalid, clearing auth state');
        clearAllTokens();
        logout();
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
  }, [hydrated, accessToken, user, location.pathname, navigate, initialize, logout]);

  // Initialize auth service when user is authenticated
  useEffect(() => {
    if (hydrated && accessToken && user) {
      // Initialize auth service for automatic token refresh and inactivity tracking
      authService.initialize();
      console.log('🔐 Auth service initialized for authenticated user');
    } else if (hydrated && (!accessToken || !user)) {
      // Clean up auth service if user is not authenticated
      authService.cleanup();
    }
  }, [hydrated, accessToken, user]);

  // Cleanup auth service on unmount
  useEffect(() => {
    return () => {
      authService.cleanup();
    };
  }, []);

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
