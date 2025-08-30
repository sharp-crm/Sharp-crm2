import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Mail, Settings, Link2, AlertCircle, Send, Shield, ExternalLink, ArrowRight, Users, Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

interface OAuthStatus {
  configured: boolean;
  verified: boolean;
  email?: string;
  provider?: string;
  error?: string;
}

const EmailIntegration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus | null>(null);
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Get user email from auth store
  const userEmail = user?.email || '';

  // Check OAuth status on component mount and when page gains focus
  useEffect(() => {
    checkOAuthStatus();
    
    // Also check when the page becomes visible (user returns from OAuth)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔍 EmailIntegration - Page became visible, checking OAuth status');
        checkOAuthStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also check when window gains focus
    const handleFocus = () => {
      console.log('🔍 EmailIntegration - Window gained focus, checking OAuth status');
      checkOAuthStatus();
    };
    
    window.addEventListener('focus', handleFocus);

    // Listen for OAuth events from the URL handler
    const handleOAuthSuccess = () => {
      console.log('🎉 OAuth success event received');
      setTimeout(() => checkOAuthStatus(), 1000); // Wait a bit for backend processing
    };

    const handleOAuthError = (event: any) => {
      console.log('❌ OAuth error event received:', event.detail?.error);
      setAuthError(event.detail?.error || 'OAuth authentication failed');
    };

    window.addEventListener('oauth-success', handleOAuthSuccess);
    window.addEventListener('oauth-error', handleOAuthError);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('oauth-success', handleOAuthSuccess);
      window.removeEventListener('oauth-error', handleOAuthError);
    };
  }, []);

  // Also check OAuth status when location changes (e.g., from OAuth redirect)
  useEffect(() => {
    console.log('🔍 EmailIntegration - Location changed, checking OAuth status');
    checkOAuthStatus();
  }, [location.pathname]);

  const checkOAuthStatus = async () => {
    setIsLoadingOAuth(true);
    try {
      console.log('🔍 EmailIntegration - Checking OAuth status...');
      const response = await API.get('/oauth/status');
      const data = response.data;
      console.log('🔍 EmailIntegration - OAuth status response:', data);
      
      if (data.success) {
        setOAuthStatus(data);
      } else {
        setOAuthStatus({
          configured: false,
          verified: false,
          error: data.error,
        });
      }
    } catch (error: any) {
      console.error('Error checking OAuth status:', error);
      setOAuthStatus({
        configured: false,
        verified: false,
        error: 'Failed to check OAuth status',
      });
    } finally {
      setIsLoadingOAuth(false);
    }
  };

  const handleGmailConnect = async () => {
    setIsConnecting(true);
    setAuthError(null);
    
    try {
      const response = await API.get('/oauth/gmail/auth-url');
      const data = response.data;
      
      if (data.success) {
        // Redirect to Gmail OAuth URL
        window.location.href = data.authUrl;
      } else {
        setAuthError(data.error || 'Failed to get Gmail authorization URL');
      }
    } catch (error: any) {
      console.error('Error getting Gmail auth URL:', error);
      setAuthError(error.response?.data?.error || 'Failed to connect to Gmail');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOutlookConnect = async () => {
    setIsConnecting(true);
    setAuthError(null);
    
    try {
      const response = await API.get('/oauth/outlook/auth-url');
      const data = response.data;
      
      if (data.success) {
        // Redirect to Outlook OAuth URL
        window.location.href = data.authUrl;
      } else {
        setAuthError(data.error || 'Failed to get Outlook authorization URL');
      }
    } catch (error: any) {
      console.error('Error getting Outlook auth URL:', error);
      setAuthError(error.response?.data?.error || 'Failed to connect to Outlook');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setAuthError(null);
    
    try {
      const response = await API.delete('/oauth/disconnect');
      const data = response.data;
      
      if (data.success) {
        setOAuthStatus({
          configured: false,
          verified: false,
        });
        alert('OAuth email configuration removed successfully');
      } else {
        setAuthError(data.error || 'Failed to disconnect OAuth');
      }
    } catch (error: any) {
      console.error('Error disconnecting OAuth:', error);
      setAuthError(error.response?.data?.error || 'Failed to disconnect OAuth');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const verifyEmailMatch = (oauthEmail?: string) => {
    if (!oauthEmail || !userEmail) return true;
    return oauthEmail.toLowerCase() === userEmail.toLowerCase();
  };

  const getStatusBadge = (configured: boolean, verified: boolean, hasError?: boolean) => {
    if (hasError) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Error</span>;
    }
    if (verified) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">✓ Ready</span>;
    }
    if (configured) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">⚠ Needs Verification</span>;
    }
    return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Not Connected</span>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          OAuth Email Integration
        </h1>
        <button
          onClick={() => navigate('/integrations/email/history')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Send className="w-4 h-4" />
          View History
        </button>
      </div>

      <div className="bg-white shadow rounded-xl p-6 space-y-6 max-w-4xl">
        {/* Header Info */}
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Secure OAuth 2.0 Email Authentication</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Connect your Gmail or Outlook account securely using OAuth 2.0. No passwords required - 
            just grant permission and start sending emails through your authenticated account.
          </p>
        </div>

        {/* Status Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-gray-500" />
              Connection Status
            </h3>
            {getStatusBadge(
              oauthStatus?.configured || false, 
              oauthStatus?.verified || false,
              !!oauthStatus?.error
            )}
          </div>
          
          {oauthStatus && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <strong>Status:</strong> 
                    <span className={`ml-1 ${
                      oauthStatus.verified ? 'text-green-600' : 
                      oauthStatus.configured ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {oauthStatus.verified ? '✓ Connected & Verified' :
                       oauthStatus.configured ? '⚠ Connected (Needs Verification)' : '✗ Not Connected'}
                    </span>
                  </p>
                  {oauthStatus.email && (
                    <p className="text-sm text-gray-600">
                      <strong>Authenticated Email:</strong> {oauthStatus.email}
                    </p>
                  )}
                  {oauthStatus.provider && (
                    <p className="text-sm text-gray-600">
                      <strong>Provider:</strong> {oauthStatus.provider.charAt(0).toUpperCase() + oauthStatus.provider.slice(1)}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    <strong>Your Account Email:</strong> {userEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={checkOAuthStatus}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    title="Refresh status from server"
                  >
                    🔄 Refresh
                  </button>
                  {oauthStatus.verified && (
                    <button
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        isDisconnecting
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {isDisconnecting ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Disconnecting...
                        </div>
                      ) : (
                        'Disconnect'
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Email Mismatch Warning */}
              {oauthStatus.verified && oauthStatus.email && !verifyEmailMatch(oauthStatus.email) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div className="text-sm text-yellow-700">
                    <p><strong>Email Mismatch Warning:</strong></p>
                    <p>Your authenticated email ({oauthStatus.email}) doesn't match your account email ({userEmail}).</p>
                    <p>Please re-authenticate with your account email to send emails.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoadingOAuth && (
            <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking OAuth status...</span>
            </div>
          )}
        </div>

        {/* Connection Section */}
        {!oauthStatus?.verified ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Connect Your Email Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Gmail Connection */}
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src="https://developers.google.com/identity/images/g-logo.png" 
                    alt="Gmail" 
                    className="w-10 h-10"
                  />
                  <div>
                    <h4 className="text-lg font-medium">Gmail</h4>
                    <p className="text-sm text-gray-500">Google Workspace & Gmail</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your Gmail account to send emails through the Gmail API using secure OAuth 2.0 authentication.
                </p>
                <ul className="text-xs text-gray-500 mb-4 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Supports Gmail & Google Workspace
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Enterprise-grade security
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    No app passwords needed
                  </li>
                </ul>
                <button
                  onClick={handleGmailConnect}
                  disabled={isConnecting}
                  className={`w-full px-4 py-2 rounded text-white flex items-center justify-center gap-2 transition-colors ${
                    isConnecting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Connect Gmail
                    </>
                  )}
                </button>
              </div>

              {/* Outlook Connection */}
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium">Outlook</h4>
                    <p className="text-sm text-gray-500">Microsoft 365 & Outlook</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your Outlook or Microsoft 365 account to send emails through Microsoft Graph API.
                </p>
                <ul className="text-xs text-gray-500 mb-4 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Supports Outlook & Microsoft 365
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Microsoft Graph API integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Modern authentication
                  </li>
                </ul>
                <button
                  onClick={handleOutlookConnect}
                  disabled={isConnecting}
                  className={`w-full px-4 py-2 rounded text-white flex items-center justify-center gap-2 transition-colors ${
                    isConnecting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Connect Outlook
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* OAuth Help Text */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">🔐 How OAuth 2.0 Authentication Works</h4>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li>Click on your preferred email provider above</li>
                <li>You'll be redirected to the official login page (Gmail or Microsoft)</li>
                <li>Log in with your credentials on their secure platform</li>
                <li>Grant permission for SharpCRM to send emails on your behalf</li>
                <li>You'll be redirected back to our application</li>
                <li>We verify that your authenticated email matches your account email</li>
                <li>Start sending emails immediately after successful authentication</li>
              </ol>
              <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-3 h-3" />
                  <strong>Security & Privacy:</strong>
                </div>
                <ul className="space-y-0.5 ml-5">
                  <li>• We never see or store your email password</li>
                  <li>• Only secure OAuth tokens are stored in AWS Secrets Manager</li>
                  <li>• You can revoke access at any time from your email provider</li>
                  <li>• All communications are encrypted</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              🎉 OAuth Email Integration Active!
            </h3>
            <p className="text-green-700 mb-2">
              Your {oauthStatus.provider} account ({oauthStatus.email}) is connected and ready to send emails.
            </p>
            <p className="text-sm text-green-600 mb-6">
              You can now send emails securely through your authenticated email account.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/integrations/email/compose')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send className="w-5 h-5" />
                Send Emails Now
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/integrations/email/history')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users className="w-5 h-5" />
                View Email History
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {authError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-red-600 font-medium">Authentication Error</p>
              <p className="text-sm text-red-600">{authError}</p>
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">OAuth Email Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-100 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Secure Authentication</h4>
                <p className="text-sm text-gray-600">OAuth 2.0 standard with no password storage</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-100 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Email Verification</h4>
                <p className="text-sm text-gray-600">Ensures authenticated email matches your account</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-100 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Multiple Providers</h4>
                <p className="text-sm text-gray-600">Support for Gmail and Outlook/Microsoft 365</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-100 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Email Tracking</h4>
                <p className="text-sm text-gray-600">Complete history and status tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailIntegration;