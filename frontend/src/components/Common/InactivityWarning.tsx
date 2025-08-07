import React, { useEffect, useState } from 'react';
import { useAuthService } from '../../hooks/useAuthService';

interface InactivityWarningProps {
  warningThreshold?: number; // Show warning 5 minutes before logout (in milliseconds)
  className?: string;
}

const InactivityWarning: React.FC<InactivityWarningProps> = ({ 
  warningThreshold = 5 * 60 * 1000, // 5 minutes
  className = ''
}) => {
  const { isAuthenticated, inactivityStatus, resetInactivity } = useAuthService();
  const [showWarning, setShowWarning] = useState(false);
  const [showRefreshError, setShowRefreshError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const { timeUntilLogout } = inactivityStatus;
      
      if (timeUntilLogout <= warningThreshold && timeUntilLogout > 0) {
        setShowWarning(true);
        setTimeLeft(Math.ceil(timeUntilLogout / 1000)); // Convert to seconds
      } else {
        setShowWarning(false);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [isAuthenticated, inactivityStatus, warningThreshold]);

  // Listen for refresh errors
  useEffect(() => {
    const handleRefreshError = (event: CustomEvent) => {
      if (event.detail?.type === 'refresh_error') {
        setShowRefreshError(true);
        setTimeout(() => setShowRefreshError(false), 10000); // Hide after 10 seconds
      }
    };

    window.addEventListener('refresh_error' as any, handleRefreshError);
    return () => window.removeEventListener('refresh_error' as any, handleRefreshError);
  }, []);

  const handleStayLoggedIn = () => {
    resetInactivity();
    setShowWarning(false);
  };

  const handleRefreshErrorDismiss = () => {
    setShowRefreshError(false);
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Inactivity Warning */}
      {showWarning && (
        <div className={`fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm ${className}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Session Timeout Warning
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You will be automatically logged out in{' '}
                  <span className="font-mono font-bold text-yellow-900">
                    {formatTime(timeLeft)}
                  </span>{' '}
                  due to inactivity.
                </p>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={handleStayLoggedIn}
                  className="bg-yellow-400 px-3 py-2 text-sm font-medium text-yellow-800 rounded-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                >
                  Stay Logged In
                </button>
                <button
                  type="button"
                  onClick={() => setShowWarning(false)}
                  className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Error Notification */}
      {showRefreshError && (
        <div className={`fixed top-4 left-4 z-50 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm ${className}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Session Refresh Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Unable to refresh your session. Please save your work and refresh the page.
                </p>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={handleRefreshErrorDismiss}
                className="inline-flex text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InactivityWarning; 