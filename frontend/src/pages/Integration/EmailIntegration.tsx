import React, { useState } from 'react';
import { Loader2, CheckCircle2, Mail, Settings, Link2 } from 'lucide-react';

const EmailIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
  });

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleSendEmail = () => {
    setIsSending(true);
    setTimeout(() => {
      setEmailSent(true);
      setIsSending(false);
      setTimeout(() => setEmailSent(false), 3000);
      setFormData({ to: '', subject: '', message: '' });
    }, 1000);
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
          <p className="text-sm text-gray-600 mt-1">
            {isConnected ? "Connected to Gmail" : "No email service connected"}
          </p>
          {!isConnected && (
            <button
              onClick={handleConnect}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect Gmail
            </button>
          )}
        </div>

        {/* Connected Sections */}
        {isConnected && (
          <>
            {/* SMTP Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                SMTP Settings
              </h2>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">SMTP Server</label>
                  <input
                    type="text"
                    readOnly
                    value="smtp.gmail.com"
                    className="mt-1 w-full p-2 border rounded bg-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Port</label>
                  <input
                    type="text"
                    readOnly
                    value="587"
                    className="mt-1 w-full p-2 border rounded bg-gray-100 text-gray-700"
                  />
                </div>
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailIntegration;
