import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Create API instance for protected routes
const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
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
        throw new Error('No refresh token available');
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

      const res = await axios.post('http://localhost:3000/api/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = res.data.data;

      // Update both Zustand store and storage
      const user = authStore.user || JSON.parse(localStorage.getItem('user') || '{}');
      authStore.login({
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        createdBy: user.createdBy,
        phoneNumber: user.phoneNumber,
        accessToken,
        refreshToken: newRefreshToken,
      });

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