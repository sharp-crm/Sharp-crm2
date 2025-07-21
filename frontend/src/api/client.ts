import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { refreshTokenRequest } from './auth';
import { API_CONFIG } from '../config/api';

// Create API instance for protected routes
const API = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
  timeout: API_CONFIG.TIMEOUT,
});

// Add auth token to requests
API.interceptors.request.use(
  (config) => {
    // Try to get token from multiple sources
    const authStore = useAuthStore.getState();
    const token = authStore.accessToken || 
                  sessionStorage.getItem('accessToken') || 
                  localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Simple response interceptor for non-auth errors
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    // For 401 errors, let the auth interceptor in auth.ts handle them
    // This prevents duplicate refresh attempts
    if (error.response?.status === 401) {
      console.log('401 error detected, will be handled by auth interceptor');
    }
    
    return Promise.reject(error);
  }
);

export default API; 