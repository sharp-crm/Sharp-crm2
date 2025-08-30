import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import API from '../api/client';

interface OAuthUrlHandlerProps {
  children: React.ReactNode;
}

const OAuthUrlHandler: React.FC<OAuthUrlHandlerProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if we have OAuth callback parameters in the URL
    // For hash routing, OAuth params might be in the main URL (before #)
    let urlParams = new URLSearchParams(location.search);
    let code = urlParams.get('code');
    let state = urlParams.get('state');
    let error = urlParams.get('error');

    // If not found in location.search, check the full window URL (before #)
    if (!code && !state) {
      const fullUrl = window.location.href;
      const urlBeforeHash = fullUrl.split('#')[0];
      const queryStart = urlBeforeHash.indexOf('?');
      if (queryStart !== -1) {
        const queryString = urlBeforeHash.substring(queryStart + 1);
        urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code');
        state = urlParams.get('state');
        error = urlParams.get('error');
        console.log('🔍 OAuthUrlHandler - Found OAuth params in full URL before hash');
      }
    }

    console.log('🔍 OAuthUrlHandler - URL params:', { code: !!code, state: !!state, error });

    if (error) {
      setStatus('error');
      setMessage(`OAuth error: ${error}`);
      // Clear URL parameters after showing error for a few seconds
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
      return;
    }

    if (code && state) {
      console.log('🔍 OAuthUrlHandler - Processing OAuth callback');
      
      // Immediately clean the URL and redirect to email integration
      // This prevents the user from being stuck on a broken callback
      const cleanUrl = window.location.origin + window.location.pathname + '#/integrations/email';
      window.history.replaceState({}, '', cleanUrl);
      
      // Process OAuth in background
      handleOAuthCallback(code, state);
      
      // Immediate redirect to email integration page
      navigate('/integrations/email', { replace: true });
    }
  }, [location.search, location.hash, navigate]);

  const handleOAuthCallback = async (code: string, state: string) => {
    // Don't block the UI - process in background
    console.log('🔍 OAuthUrlHandler - Processing OAuth in background...');

    try {
      // Decode the state to determine the provider
      console.log('🔍 OAuthUrlHandler - Decoding state:', state);
      const stateData = JSON.parse(atob(state));
      const provider = stateData.provider;
      console.log('🔍 OAuthUrlHandler - Provider:', provider);

      if (!['gmail', 'outlook'].includes(provider)) {
        console.error('🔍 OAuthUrlHandler - Invalid provider:', provider);
        return;
      }

      // Send the authorization code to the backend
      console.log('🔍 OAuthUrlHandler - Calling backend:', `/oauth/callback/${provider}`);
      const response = await API.get(`/oauth/callback/${provider}`, {
        params: { code, state },
        timeout: 10000 // 10 second timeout
      });

      console.log('🔍 OAuthUrlHandler - Backend response:', response.data);

      if (response.data.success) {
        console.log('✅ OAuth authentication successful!');
        // The user is already on the email integration page, just refresh the status
        window.dispatchEvent(new CustomEvent('oauth-success'));
      } else {
        console.error('❌ OAuth authentication failed:', response.data.error);
        window.dispatchEvent(new CustomEvent('oauth-error', { 
          detail: { error: response.data.error || 'OAuth authentication failed' }
        }));
      }
    } catch (error: any) {
      console.error('❌ OAuth callback error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process OAuth callback';
      window.dispatchEvent(new CustomEvent('oauth-error', { 
        detail: { error: errorMessage }
      }));
    }
  };

  // No longer blocking UI - OAuth processing happens in background
  return <>{children}</>;
};

export default OAuthUrlHandler;
