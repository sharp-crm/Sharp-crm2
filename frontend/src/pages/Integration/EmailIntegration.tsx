import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Mail, Settings, Link2, AlertCircle, Send, Key, Server, Shield, TestTube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

const EmailIntegration: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [userEmailStatus, setUserEmailStatus] = useState<{
    configured: boolean;
    verified: boolean;
    email?: string;
    error?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
  });

  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: '',
    port: 587,
    secure: false,
    auth: {
      user: user?.email || '',
      pass: '', // Always start with empty password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Get user email from auth store
  const userEmail = user?.email || '';

  // Check user email configuration on component mount
  useEffect(() => {
    checkUserEmailConfiguration();
  }, []);

  // Auto-sync SMTP username with user email
  useEffect(() => {
    if (userEmail) {
      setSmtpConfig(prev => ({
        ...prev,
        auth: {
          ...prev.auth,
          user: userEmail,
        },
      }));
    }
  }, [userEmail]);

  // Ensure password is always empty on mount and when user changes
  useEffect(() => {
    setSmtpConfig(prev => ({
      ...prev,
      auth: {
        ...prev.auth,
        pass: '',
      },
    }));
  }, [userEmail]); // Clear password when user changes

  const checkUserEmailConfiguration = async () => {
    try {
      const response = await API.get('/email/user-config');
      const data = response.data;
      
      if (data.success) {
        setUserEmailStatus(data);
        const shouldBeConnected = data.configured && data.verified;
        setIsConnected(shouldBeConnected);
        // User email is already set from auth store
      } else {
        setUserEmailStatus({
          configured: false,
          verified: false,
          error: data.error,
        });
        setIsConnected(false);
      }
    } catch (error: any) {
      console.error('Error checking user email configuration:', error);
      setUserEmailStatus({
        configured: false,
        verified: false,
        error: 'Failed to check email configuration',
      });
      setIsConnected(false);
    }
  };

  const handleSMTPConfigChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSmtpConfig(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof SMTPConfig] as any),
          [child]: value,
        },
      }));
      } else {
      setSmtpConfig(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleTestConnection = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const response = await API.post('/email/test-smtp', { smtpConfig });
      const data = response.data;
      
      if (data.success) {
        setConnectionError(null);
        // Show success message
        alert('SMTP connection test successful! You can now save your configuration.');
      } else {
        setConnectionError(data.error || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Error testing SMTP connection:', error);
      setConnectionError(`Failed to test connection: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!userEmail.trim()) {
      setConfigError('Please enter your email address');
      return;
    }

    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      setConfigError('Please fill in all required SMTP fields');
      return;
    }

    setIsConfiguring(true);
    setConfigError(null);
    
    try {
      const response = await API.post('/email/configure-smtp', {
        email: userEmail,
        smtpConfig,
      });
      
      const data = response.data;
      
      if (data.success) {
        setConfigError(null);
        alert('SMTP configuration saved successfully! Please verify your email to complete setup.');
        // Refresh user email status
        await checkUserEmailConfiguration();
      } else {
        setConfigError(data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Error saving SMTP configuration:', error);
      setConfigError(`Failed to save configuration: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!userEmail.trim() || !smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      setVerificationError('Please ensure all SMTP configuration fields are filled');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const response = await API.post('/email/verify-email', {
        email: userEmail,
        smtpConfig,
      });
      
      const data = response.data;
      
      if (data.success) {
        setVerificationError(null);
        alert('Email verification successful! You can now send emails.');
        
        // Update the connection status immediately
        setIsConnected(true);
        
        // Update user email status locally to show verified
        setUserEmailStatus(prev => prev ? {
          ...prev,
          verified: true
        } : null);
        
        // Don't refresh from backend immediately - let the local state persist
        // The backend refresh will happen on the next page load or manual refresh
      } else {
        setVerificationError(data.error || 'Email verification failed');
      }
    } catch (error: any) {
      console.error('Error verifying email:', error);
      setVerificationError(`Failed to verify email: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsVerifying(false);
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

  const getCommonSMTPConfigs = () => [
    {
      name: 'Gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    },
    {
      name: 'Outlook/Hotmail',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
    },
    {
      name: 'Yahoo',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
    },
    {
      name: 'Office 365',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
    },
  ];

  const applyCommonConfig = (config: any) => {
    setSmtpConfig(prev => ({
      ...prev,
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        ...prev.auth,
        pass: '', // Always clear password when applying new config
      },
    }));
  };

  const clearPassword = () => {
    setSmtpConfig(prev => ({
      ...prev,
      auth: {
        ...prev.auth,
        pass: '',
      },
    }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          Email Integration
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
        {/* Status Section */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-gray-500" />
              Connection Status
            </h2>
          </div>
          
                     {userEmailStatus && (
             <div className="mt-2 p-3 bg-gray-50 rounded-lg">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-gray-600">
                     <strong>Service:</strong> NodeMailer SMTP
                   </p>
                   <p className="text-sm text-gray-600">
                     <strong>Status:</strong> 
                     <span className={`ml-1 ${
                       userEmailStatus.verified ? 'text-green-600' : 
                       userEmailStatus.configured ? 'text-yellow-600' : 'text-red-600'
                     }`}>
                       {userEmailStatus.verified ? '✓ Verified & Ready' :
                        userEmailStatus.configured ? '⚠ Configured (Needs Verification)' : '✗ Not Configured'}
                     </span>
                   </p>
                   {userEmailStatus.email && (
                     <p className="text-sm text-gray-600">
                       <strong>Email:</strong> {userEmailStatus.email}
                     </p>
                   )}
                 </div>
                 <button
                   onClick={checkUserEmailConfiguration}
                   className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                   title="Refresh status from server"
                 >
                   🔄 Refresh
                 </button>
               </div>
             </div>
           )}
          
          {connectionError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-600">{connectionError}</p>
            </div>
          )}
        </div>
          
        {/* SMTP Configuration Section */}
          {!isConnected && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-500" />
              Configure SMTP Settings
            </h2>

            {/* Common SMTP Configurations */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Setup (Common Providers)</label>
              <div className="flex flex-wrap gap-2">
                {getCommonSMTPConfigs().map((config, index) => (
                  <button
                    key={index}
                    onClick={() => applyCommonConfig(config)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Email Address Display */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Your Email Address
                </label>
                <div className="w-full p-2 bg-gray-50 border rounded text-gray-700">
                  {userEmail || 'Loading...'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This is your authenticated email address from your account
                </p>
              </div>

              {/* SMTP Host */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Server className="w-4 h-4 inline mr-1" />
                  SMTP Server
                </label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) => handleSMTPConfigChange('host', e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* SMTP Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4 inline mr-1" />
                  Port
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={smtpConfig.port}
                  onChange={(e) => handleSMTPConfigChange('port', parseInt(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Username - Hidden since it auto-syncs with user email */}
              <input
                type="hidden"
                value={userEmail}
                onChange={(e) => handleSMTPConfigChange('auth.user', e.target.value)}
              />

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4 inline mr-1" />
                  Password/App Password
                </label>
                <input
                  type="password"
                  placeholder="Your password or app password"
                  value={smtpConfig.auth.pass}
                  onChange={(e) => handleSMTPConfigChange('auth.pass', e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    Enter your SMTP password or Gmail App Password
                  </p>
                </div>
              </div>

              {/* Security Options */}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={smtpConfig.secure}
                      onChange={(e) => handleSMTPConfigChange('secure', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Use SSL/TLS (port 465)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={smtpConfig.tls?.rejectUnauthorized || false}
                      onChange={(e) => handleSMTPConfigChange('tls.rejectUnauthorized', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Strict SSL verification</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-4">
            <button
                onClick={handleTestConnection}
                disabled={isConnecting || !smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass}
                className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
                isConnecting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    Test Connection
                  </>
                )}
              </button>

              <button
                onClick={handleSaveConfiguration}
                disabled={isConfiguring || !userEmail || !smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass}
                className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
                  isConfiguring
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isConfiguring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>

              {userEmailStatus?.configured && !userEmailStatus?.verified && (
                <button
                  onClick={handleVerifyEmail}
                  disabled={isVerifying || !userEmail || !smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass}
                  className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
                    isVerifying
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isVerifying ? (
                    <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
              ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Verify Email
                    </>
              )}
            </button>
          )}
        </div>

            {/* Error Messages */}
            {configError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600">{configError}</p>
                </div>
            )}

            {verificationError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600">{verificationError}</p>
                </div>
            )}

            {/* Help Text */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">💡 Setup Instructions:</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Your email address is automatically filled from your account</li>
                <li>Enter your SMTP server details (host, port, password)</li>
                <li>Username is automatically set to match your email</li>
                <li>Test the connection to verify your settings</li>
                <li>Save your configuration</li>
                <li>Verify your email by clicking the verification button</li>
                <li>Once verified, you can start sending emails!</li>
              </ol>
              <div className="mt-2 text-xs text-blue-600">
                <strong>Note:</strong> For Gmail, you may need to use an App Password instead of your regular password.
              </div>
            </div>
            </div>
        )}

        {/* Connected Sections */}
        {isConnected && (
          <>
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

