import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import authService from '../services/authService';

interface UseAuthServiceReturn {
  isAuthenticated: boolean;
  inactivityStatus: {
    lastActivity: Date;
    timeUntilLogout: number;
  };
  resetInactivity: () => void;
  manualRefreshToken: () => Promise<boolean>;
}

/**
 * Hook for managing authentication service functionality
 * Provides access to inactivity tracking and manual token refresh
 */
export const useAuthService = (): UseAuthServiceReturn => {
  const { accessToken, user } = useAuthStore((s) => ({
    accessToken: s.accessToken,
    user: s.user
  }));

  const [inactivityStatus, setInactivityStatus] = useState(() => 
    authService.getInactivityStatus()
  );

  const isAuthenticated = !!(accessToken && user);

  // Update inactivity status every minute
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      setInactivityStatus(authService.getInactivityStatus());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Reset inactivity timer
  const resetInactivity = useCallback(() => {
    authService.resetInactivity();
    setInactivityStatus(authService.getInactivityStatus());
  }, []);

  // Manual token refresh
  const manualRefreshToken = useCallback(async (): Promise<boolean> => {
    const success = await authService.manualRefreshToken();
    if (success) {
      setInactivityStatus(authService.getInactivityStatus());
    }
    return success;
  }, []);

  return {
    isAuthenticated,
    inactivityStatus,
    resetInactivity,
    manualRefreshToken
  };
}; 