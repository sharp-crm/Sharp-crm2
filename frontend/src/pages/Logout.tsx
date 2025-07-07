import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const Logout: React.FC = () => {
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    logout();
  }, [logout]);

  return null; // No UI needed
};

export default Logout;
