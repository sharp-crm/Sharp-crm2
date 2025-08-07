import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { refreshTokenRequest } from './auth';
import { API_CONFIG } from '../config/api';
import authService from '../services/authService';

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

// Response interceptor for automatic token refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh tokens for auth endpoints or non-401 errors
    const isAuthEndpoint = originalRequest.url?.includes('/login') || 
                          originalRequest.url?.includes('/register') ||
                          originalRequest.url?.includes('/refresh') ||
                          originalRequest.url?.includes('/logout');

    // Skip token refresh for:
    // 1. Non-401 errors
    // 2. Already retried requests
    // 3. Authentication endpoints (login, register, refresh, logout)
    if (error.response?.status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Only attempt refresh for actual API calls that require authentication
    originalRequest._retry = true;

    try {
      const authStore = useAuthStore.getState();
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(axios(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      // Use the auth service for token refresh
      const refreshSuccess = await authService.manualRefreshToken();
      
      if (!refreshSuccess) {
        throw new Error('Token refresh failed');
      }

      // Get the updated token from the store
      const updatedToken = useAuthStore.getState().accessToken;
      if (!updatedToken) {
        throw new Error('No access token available after refresh');
      }

      // Update the original request with the new token
      originalRequest.headers['Authorization'] = `Bearer ${updatedToken}`;

      processQueue(null, updatedToken);
      return axios(originalRequest);
    } catch (err) {
      processQueue(err, null);
      const authStore = useAuthStore.getState();
      authStore.logout();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default API; 