import { useAuthStore } from '../store/useAuthStore';
import { isTokenExpired } from '../utils/auth';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { accessToken, user } = useAuthStore((s) => ({ 
    accessToken: s.accessToken, 
    user: s.user 
  }));

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
