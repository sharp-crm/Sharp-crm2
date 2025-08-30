import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Mail, Send, AlertCircle, ArrowLeft, Users, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

interface OAuthStatus {
  configured: boolean;
  verified: boolean;
  email?: string;
  provider?: string;
  error?: string;
}

const EmailCompose: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
    cc: '',
    bcc: '',
  });

  // Get user email from auth store
  const userEmail = user?.email || '';

  useEffect(() => {
    checkOAuthStatus();
  }, []);

  const checkOAuthStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await API.get('/oauth/status');
      const data = response.data;
      
      if (data.success) {
        setOAuthStatus(data);
        // If not verified, redirect to main integration page
        if (!data.verified) {
          navigate('/integrations/email');
        }
      } else {
        setOAuthStatus({
          configured: false,
          verified: false,
          error: data.error,
        });
        navigate('/integrations/email');
      }
    } catch (error: any) {
      console.error('Error checking OAuth status:', error);
      navigate('/integrations/email');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setEmailError(null);
    
    try {
      const emailData = {
        to: formData.to,
        subject: formData.subject,
        message: formData.message,
        cc: formData.cc || undefined,
        bcc: formData.bcc || undefined,
      };

      const response = await API.post('/oauth/send-email', emailData);
      const data = response.data;
      
      if (data.success) {
        setEmailSent(true);
        setFormData({ to: '', subject: '', message: '', cc: '', bcc: '' });
        setTimeout(() => setEmailSent(false), 5000);
      } else {
        setEmailError(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      setEmailError(error.response?.data?.error || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const isEmailValid = (email: string) => {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canSendEmail = () => {
    return isEmailValid(formData.to) && 
           formData.subject.trim() && 
           formData.message.trim();
  };

  const verifyEmailMatch = () => {
    if (!oauthStatus?.email || !userEmail) return true;
    return oauthStatus.email.toLowerCase() === userEmail.toLowerCase();
  };

  if (isLoadingStatus) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Checking OAuth status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!oauthStatus?.verified || !verifyEmailMatch()) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">OAuth Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to authenticate your email account before sending emails.
          </p>
          <button
            onClick={() => navigate('/integrations/email')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Email Integration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/integrations/email')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Integration
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            Compose Email
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/integrations/email/history')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            View History
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-xl p-6 space-y-6 max-w-4xl">
        {/* OAuth Status Header */}
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                Authenticated with {oauthStatus.provider?.charAt(0).toUpperCase() + oauthStatus.provider?.slice(1)}
              </p>
              <p className="text-sm text-green-600">{oauthStatus.email}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            ✓ Ready to Send
          </span>
        </div>

        {/* Email Form */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Compose Your Email</h2>

          <div className="space-y-4">
            {/* Recipients Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CC</label>
                <input
                  type="email"
                  placeholder="cc@example.com"
                  value={formData.cc}
                  onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">BCC</label>
                <input
                  type="email"
                  placeholder="bcc@example.com"
                  value={formData.bcc}
                  onChange={(e) => setFormData({ ...formData, bcc: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter email subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Write your message here..."
                rows={8}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {formData.message.length} characters
                </p>
                <p className="text-xs text-gray-500">
                  Plain text supported
                </p>
              </div>
            </div>

            {/* Send Button */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSendEmail}
                  disabled={!canSendEmail() || isSending}
                  className={`px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    !canSendEmail() || isSending
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Email
                    </>
                  )}
                </button>

                {!canSendEmail() && !isSending && (
                  <p className="text-sm text-gray-500">
                    Please fill in all required fields to send email
                  </p>
                )}
              </div>

              <div className="text-sm text-gray-500">
                Sending via {oauthStatus.provider?.charAt(0).toUpperCase() + oauthStatus.provider?.slice(1)} OAuth
              </div>
            </div>

            {/* Success Message */}
            {emailSent && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-green-800 font-medium">Email sent successfully!</p>
                  <p className="text-green-600 text-sm">
                    Your email has been sent using OAuth authentication.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {emailError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-red-800 font-medium">Failed to send email</p>
                  <p className="text-red-600 text-sm">{emailError}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email Tips */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Email Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-1">Professional Communication</h4>
              <p className="text-sm text-blue-700">
                Use clear, concise subject lines and professional language to improve email effectiveness.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-1">OAuth Security</h4>
              <p className="text-sm text-green-700">
                Your emails are sent securely through OAuth 2.0 authentication without exposing passwords.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailCompose;
