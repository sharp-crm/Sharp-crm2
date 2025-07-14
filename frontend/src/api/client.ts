import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { refreshTokenRequest } from './auth';

// Create API instance for protected routes
const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
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

// Handle token refresh
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

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const authStore = useAuthStore.getState();
      const refreshToken = authStore.refreshToken || 
                          sessionStorage.getItem('refreshToken') || 
                          localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token available, logout and redirect
        authStore.logout();
        return Promise.reject(new Error('No refresh token available'));
      }

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

      const res = await refreshTokenRequest();
      const { accessToken } = res.data;

      if (!accessToken) {
        throw new Error('Invalid refresh token response');
      }

      // Update access token in store
      authStore.setAccessToken(accessToken);

      // Update axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

      processQueue(null, accessToken);
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