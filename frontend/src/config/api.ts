// API Configuration
export const API_CONFIG = {
  // Get API URL from environment variables
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  
  // Get base URL without /api for socket connections
  SOCKET_URL: (() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      return apiUrl.replace('/api', '');
    }
    return 'http://localhost:3000';
  })(),
  
  // Timeout settings
  TIMEOUT: 10000,
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// Environment detection
export const ENV = {
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  IS_TEST: import.meta.env.MODE === 'test',
} as const;

// Log configuration in development
if (ENV.IS_DEVELOPMENT) {
  console.log('🔧 API Configuration:', API_CONFIG);
} 