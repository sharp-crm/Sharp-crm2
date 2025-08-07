import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore'; // adjust the path as needed

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// 1. Axios Instance for protected API calls (with interceptor)
const API = axios.create({
  baseURL: API_URL, // Remove /auth from base URL for general API calls
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for cross-origin requests
});

// 2. Separate Axios instance for auth endpoints (without interceptor)
const AUTH_API = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// 3. Auth API functions using the separate instance
export const registerUser = (data: { email: string; password: string; firstName: string; lastName: string; role?: string; phoneNumber?: string; dateOfBirth?: string }) => 
  AUTH_API.post('/register', data);
export const loginUser = (data: { email: string; password: string }) => 
  AUTH_API.post('/login', data);
export const refreshTokenRequest = () => {
  const fullUrl = `${AUTH_API.defaults.baseURL}/refresh`;
  console.log('🔄 Refresh token request URL:', fullUrl);
  console.log('🔄 AUTH_API baseURL:', AUTH_API.defaults.baseURL);
  console.log('🔄 API_URL:', API_URL);
  return AUTH_API.post('/refresh', {}); // Token will be sent via cookie
};

// 4. 🔁 Axios Interceptor Code — place HERE after API instance is defined
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

      // Call refresh endpoint - token will be sent via cookie
      const res = await refreshTokenRequest();
      const { accessToken, user } = res.data;

      if (!accessToken) {
        throw new Error('Invalid refresh token response');
      }

      // Update store with new access token and user info
      authStore.setAccessToken(accessToken);
      if (user) {
        authStore.setUser(user);
      }

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

// 5. Default export of API (optional)
export default API;
