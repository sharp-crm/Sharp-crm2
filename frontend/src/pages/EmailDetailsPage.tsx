import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, User, Clock, AlertCircle, CheckCircle2, Clock as ClockIcon, Send } from 'lucide-react';
import API from '../api/client';

interface EmailDetails {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  message: string;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt: string;
  updatedAt?: string;
  userId: string;
  tenantId?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    campaignId?: string;
    dealId?: string;
    contactId?: string;
  };
}

const EmailDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadEmailDetails(id);
    }
  }, [id]);

  const loadEmailDetails = async (emailId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await API.get(`/email/history/${emailId}`);
      const data = response.data;
      
      if (data.success) {
        setEmail(data.email);
      } else {
        setError(data.error || 'Failed to load email details');
      }
    } catch (error: any) {
      console.error('Error loading email details:', error);
      if (error.response?.status === 404) {
        setError('Email not found');
      } else if (error.response?.status === 403) {
        setError('Access denied to this email');
      } else {
        setError('Failed to load email details');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString()
    };
  };

  const handlePrint = () => {
    // Open print layout in new tab
    const printWindow = window.open('', '_blank');
    if (printWindow && email) {
      const dateInfo = formatDate(email.sentAt);
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SparkCRM - ${email.subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: #333;
              line-height: 1.6;
            }
            .header {
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .subject {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #111827;
            }
            .metadata {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              font-size: 14px;
              color: #6b7280;
            }
            .metadata-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .content {
              margin-top: 20px;
            }
            .message {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin-top: 15px;
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.6;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .header { border-bottom: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">SparkCRM</div>
            <div class="subject">Sub: ${email.subject}</div>
            <div class="metadata">
              <div class="metadata-item">
                <strong>From:</strong> ${email.senderEmail}
              </div>
              <div class="metadata-item">
                <strong>To:</strong> ${email.recipientEmail}
              </div>
              <div class="metadata-item">
                <strong>Sent:</strong> ${dateInfo.full}
              </div>
            </div>
          </div>
          <div class="content">
            <div class="message">${email.message}</div>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email details...</p>
        </div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Email</h1>
          <p className="text-gray-600 mb-6">{error || 'Email not found'}</p>
          <button
            onClick={() => navigate('/integrations/email')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Email Integration
          </button>
        </div>
      </div>
    );
  }

  const dateInfo = formatDate(email.sentAt);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/integrations/email')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Email Details</h1>
                <p className="text-sm text-gray-500">Viewing email sent on {dateInfo.date}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(email.status)}`}>
                {getStatusIcon(email.status)}
                {email.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Email Header */}
          <div className="border-b p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sub: {email.subject}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium text-gray-900">{email.senderEmail}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">To:</span>
                    <span className="font-medium text-gray-900">{email.recipientEmail}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right text-sm text-gray-500">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Sent</span>
                </div>
                <div className="font-medium">{dateInfo.full}</div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Content</h3>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="whitespace-pre-wrap text-gray-900 font-medium">
                {email.message}
              </div>
            </div>
          </div>

          {/* Error Details (if failed) */}
          {email.errorMessage && (
            <div className="border-t p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4">Error Details</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{email.errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => navigate('/integrations/email')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Email Integration</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDetailsPage;
