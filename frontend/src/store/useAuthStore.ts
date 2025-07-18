import axios from 'axios';
import { create } from 'zustand';
import { User } from '../types';
import { API_CONFIG } from '../config/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  token: string | null;
  login: (payload: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId?: string;
    createdBy?: string;
    phoneNumber?: string;
    accessToken: string;
    refreshToken?: string; // Optional since it's now in cookies
  }) => void;
  logout: () => void;
  initializeFromSession: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAccessToken: (token: string | null) => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  token: null,

  login: (payload) => {
    const { userId, email, firstName, lastName, role, tenantId, createdBy, phoneNumber, accessToken, refreshToken } = payload;
    const user = { userId, email, firstName, lastName, role, tenantId, createdBy, phoneNumber };
    set({ user, accessToken, refreshToken: refreshToken || null });

    // Store in both session and local storage (access token only, refresh token is in cookie)
    sessionStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('accessToken', accessToken);
    
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    
    // Only store refresh token in storage if provided (backwards compatibility)
    if (refreshToken) {
      sessionStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  logout: async () => {
    try {
      await axios.post(`${API_CONFIG.BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.warn('Logout API failed or not implemented.');
    }

    set({ user: null, accessToken: null, refreshToken: null });
    sessionStorage.clear();
    localStorage.clear();

    // Let the AuthWrapper handle the navigation after state change
    // This prevents direct window.location manipulation
  },

  initializeFromSession: () => {
    // Try session storage first
    let userStr = sessionStorage.getItem('user');
    let accessToken = sessionStorage.getItem('accessToken');
    let refreshToken = sessionStorage.getItem('refreshToken');

    // If not in session storage, try local storage
    if (!userStr || !accessToken || !refreshToken) {
      userStr = localStorage.getItem('user');
      accessToken = localStorage.getItem('accessToken') || localStorage.getItem('authToken'); // Legacy support
      refreshToken = localStorage.getItem('refreshToken');
    }

    if (userStr && accessToken && refreshToken) {
      try {
        const user = JSON.parse(userStr);
        
        // Validate token before setting state
        const isValidToken = (() => {
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp > currentTime;
          } catch {
            return false;
          }
        })();

        if (isValidToken) {
          set({ user, accessToken, refreshToken });
        } else {
          console.warn('Stored token is expired, clearing auth state');
          sessionStorage.clear();
          localStorage.clear();
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Clear invalid data
        sessionStorage.clear();
        localStorage.clear();
      }
    }
  },

  setUser: (user) => set({ user }),

  setToken: (token) => set({ token }),

  setAccessToken: (accessToken) => {
    set({ accessToken });
    if (accessToken) {
      sessionStorage.setItem('accessToken', accessToken);
      localStorage.setItem('accessToken', accessToken);
    }
  },

  updateUser: (user) => set({ user }),
}));

export default useAuthStore;