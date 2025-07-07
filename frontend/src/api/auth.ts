import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore'; // adjust the path as needed

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// 1. Axios Instance
const API = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Auth API functions
export const registerUser = (data: { email: string; password: string; username: string; role?: string }) => 
  API.post('/register', data);
export const loginUser = (data: { email: string; password: string }) => 
  API.post('/login', data);
export const refreshTokenRequest = (refreshToken: string) =>
  API.post('/refresh', { refreshToken });

// 3. 🔁 Axios Interceptor Code — place HERE after API instance is defined
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

      const res = await refreshTokenRequest(refreshToken);
      const { accessToken, refreshToken: newRefreshToken } = res.data;

      if (!accessToken || !newRefreshToken) {
        throw new Error('Invalid refresh token response');
      }

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

// 4. Default export of API (optional)
export default API;
