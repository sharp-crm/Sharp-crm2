// components/AuthWrapper.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialize = useAuthStore((s) => s.initializeFromSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
    setHydrated(true);
  }, [initialize]);

  useEffect(() => {
    if (hydrated) {
      const publicPaths = ['/login', '/signup', '/forgot-password'];
      const isPublicPath = publicPaths.includes(location.pathname);

      if (!accessToken && !isPublicPath) {
        navigate('/login', { replace: true });
      } else if (accessToken && isPublicPath) {
        navigate('/', { replace: true });
      }
    }
  }, [hydrated, accessToken, location.pathname, navigate]);

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
