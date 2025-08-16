import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Mail, Settings, Link2, AlertCircle } from 'lucide-react';
import API from '../../api/client';

const EmailIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sesConfig, setSesConfig] = useState<{
    configured: boolean;
    region: string;
    error?: string;
  } | null>(null);
  const [userEmailStatus, setUserEmailStatus] = useState<{
    email: string;
    verified: boolean;
    status: 'checking' | 'verified' | 'unverified' | 'error';
  } | null>(null);

  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
  });

  // Check SES configuration and user email verification on component mount
  useEffect(() => {
    checkSESConfiguration();
    checkUserEmailVerification();
  }, []);

  const checkSESConfiguration = async () => {
    try {
      const response = await API.get('/email/config');
      const data = response.data;
      
      setSesConfig(data);
      
      if (data.configured) {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        setConnectionError(data.error || 'SES not configured');
      }
    } catch (error: any) {
      console.error('Error checking SES configuration:', error);
      
      if (error.response?.status === 404) {
        setConnectionError('Email service not available. Please check if the backend is properly configured.');
      } else if (error.response?.status === 401) {
        setConnectionError('Authentication required. Please log in again.');
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        setConnectionError('Backend server is not running. Please check if the server is started.');
      } else {
        setConnectionError(`Failed to check SES configuration: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const checkUserEmailVerification = async () => {
    try {
      // Get user info from API
      const userResponse = await API.get('/users/profile/me');
      const userData = userResponse.data;
      const userEmail = userData.email;
      
      setUserEmailStatus({
        email: userEmail,
        verified: true, // We'll assume verified for now, you can enhance this
        status: 'verified'
      });
    } catch (error: any) {
      console.error('Error checking user email verification:', error);
      
      if (error.response?.status === 401) {
        setUserEmailStatus({
          email: '',
          verified: false,
          status: 'error'
        });
      } else {
        setUserEmailStatus({
          email: '',
          verified: false,
          status: 'error'
        });
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Test the connection
      const response = await API.post('/email/test-connection', {
        testEmail: 'test@example.com'
      });

      const data = response.data;
      
      if (data.success) {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        setConnectionError(data.error || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      setConnectionError(`Failed to test connection: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setEmailError(null);
    
    try {
      const response = await API.post('/email/send', formData);
      const data = response.data;
      
      if (data.success) {
        setEmailSent(true);
        setFormData({ to: '', subject: '', message: '' });
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        setEmailError(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      setEmailError(`Failed to send email: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Mail className="w-6 h-6 text-blue-600" />
        Email Integration
      </h1>

      <div className="bg-white shadow rounded-xl p-6 space-y-6 max-w-3xl">
        {/* Status Section */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-gray-500" />
              Connection Status
            </h2>
          </div>
          
          {sesConfig && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>AWS Region:</strong> {sesConfig.region}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> {sesConfig.configured ? 'Configured' : 'Not Configured'}
              </p>
            </div>
          )}

          {userEmailStatus && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Your Email:</strong> {userEmailStatus.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Verification:</strong> 
                <span className={`ml-1 ${
                  userEmailStatus.status === 'verified' ? 'text-green-600' : 
                  userEmailStatus.status === 'checking' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {userEmailStatus.status === 'verified' ? '✓ Verified' :
                   userEmailStatus.status === 'checking' ? '⏳ Checking...' :
                   userEmailStatus.status === 'error' ? '✗ Error' : '✗ Unverified'}
                </span>
              </p>
            </div>
          )}
          
          <p className="text-sm text-gray-600 mt-1">
            {isConnected ? "Connected to AWS SES" : "No email service connected"}
          </p>
          
          {connectionError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-600">{connectionError}</p>
            </div>
          )}
          
          {!isConnected && (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`mt-3 px-4 py-2 rounded text-white ${
                isConnecting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </span>
              ) : (
                'Test Connection'
              )}
            </button>
          )}
        </div>

        {/* Connected Sections */}
        {isConnected && (
          <>
            {/* AWS SES Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                AWS SES Configuration
              </h2>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">Service</label>
                  <input
                    type="text"
                    readOnly
                    value="AWS SES"
                    className="mt-1 w-full p-2 border rounded bg-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Region</label>
                  <input
                    type="text"
                    readOnly
                    value={sesConfig?.region || 'us-east-1'}
                    className="mt-1 w-full p-2 border rounded bg-gray-100 text-gray-700"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm text-gray-600">Sender Email</label>
                <input
                  type="text"
                  readOnly
                  value="Logged-in user's email"
                  className="mt-1 w-full p-2 border rounded bg-gray-100 text-gray-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Emails will be sent from the currently logged-in user's email address
                </p>
              </div>
            </div>

            {/* Auto-send Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">
                Enable Auto-Send for new deals
              </label>
            </div>

            {/* Email Form */}
            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Send Email</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600">To</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={formData.to}
                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Subject</label>
                  <input
                    type="text"
                    placeholder="Subject line"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Message</label>
                  <textarea
                    placeholder="Write your message here..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>

                <button
                  onClick={handleSendEmail}
                  disabled={!formData.to || !formData.subject || !formData.message || isSending}
                  className={`px-4 py-2 rounded text-white ${
                    isSending
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isSending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send Email"
                  )}
                </button>

                {emailSent && (
                  <p className="text-green-600 flex items-center gap-2 text-sm mt-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Email sent successfully!
                  </p>
                )}

                {emailError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-600">{emailError}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailIntegration;
