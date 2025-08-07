import React, { useEffect, useState } from 'react';
import { useAuthService } from '../../hooks/useAuthService';
import { useAuthStore } from '../../store/useAuthStore';
import { getRefreshTokenExpiryInfo } from '../../utils/token';

const AuthStatus: React.FC = () => {
  const { isAuthenticated, inactivityStatus } = useAuthService();
  const { user, accessToken } = useAuthStore();
  const [refreshTokenInfo, setRefreshTokenInfo] = useState<any>(null);

  useEffect(() => {
    const updateRefreshTokenInfo = () => {
      const info = getRefreshTokenExpiryInfo();
      setRefreshTokenInfo(info);
    };

    updateRefreshTokenInfo();
    const interval = setInterval(updateRefreshTokenInfo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated || !user) {
    return null;
  }

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeUntilLogout = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm opacity-75 hover:opacity-100 transition-opacity">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Session Status</h3>
        <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-400' : 'bg-red-400'}`}></div>
      </div>
      
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>User:</span>
          <span className="font-medium">{user.email}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Role:</span>
          <span className="font-medium">{user.role}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Access Token:</span>
          <span className="font-mono text-xs">
            {accessToken ? `${accessToken.substring(0, 8)}...` : 'None'}
          </span>
        </div>
        
        {refreshTokenInfo && (
          <div className="flex justify-between">
            <span>Refresh Token:</span>
            <span className={`font-medium ${refreshTokenInfo.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {refreshTokenInfo.isValid ? 'Valid' : 'Expired'}
            </span>
          </div>
        )}
        
        {refreshTokenInfo && refreshTokenInfo.isValid && (
          <div className="flex justify-between">
            <span>Refresh Expires:</span>
            <span className="font-medium">
              {refreshTokenInfo.daysLeft > 0 ? `${refreshTokenInfo.daysLeft}d` : 
               refreshTokenInfo.hoursLeft > 0 ? `${refreshTokenInfo.hoursLeft}h` : 
               `${refreshTokenInfo.minutesLeft}m`}
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>Inactivity Timer:</span>
          <span className="font-medium">
            {formatTimeUntilLogout(inactivityStatus.timeUntilLogout)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Last Activity:</span>
          <span className="font-medium">
            {new Date(inactivityStatus.lastActivity).toLocaleTimeString()}
          </span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Auto-refresh:</span>
          <span className="font-medium">Active</span>
        </div>
      </div>
    </div>
  );
};

export default AuthStatus; 