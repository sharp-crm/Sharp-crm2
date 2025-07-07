import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { isTokenExpired } from '../utils/auth';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { accessToken, user } = useAuthStore((s) => ({ 
    accessToken: s.accessToken, 
    user: s.user 
  }));

  // Check multiple sources for authentication
  const storedToken = accessToken || 
                     sessionStorage.getItem('accessToken') || 
                     localStorage.getItem('accessToken') ||
                     localStorage.getItem('authToken');
  
  const storedUser = user || 
                    JSON.parse(sessionStorage.getItem('user') || 'null') ||
                    JSON.parse(localStorage.getItem('user') || 'null');

  // If no token found anywhere, redirect to login
  if (!storedToken || !storedUser) {
    return <Navigate to="/login" />;
  }

  // If token is expired, redirect to login
  if (isTokenExpired(storedToken)) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
