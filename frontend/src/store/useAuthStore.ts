import axios from 'axios';
import { create } from 'zustand';
import { User } from '../types';
import { API_CONFIG } from '../config/api';
import { isTokenValid } from '../utils/token';

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

export const useAuthStore = create<AuthState>((set, get) => ({
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

    // Set axios default Authorization header for all future requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    console.log('✅ Login successful - Token stored and axios headers set');
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

    // Clear axios default Authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    console.log('✅ Logout successful - Storage cleared and axios headers removed');

    // Let the AuthWrapper handle the navigation after state change
    // This prevents direct window.location manipulation
  },

  initializeFromSession: () => {
    console.log('🔄 initializeFromSession called');
    
    // Try session storage first
    let userStr = sessionStorage.getItem('user');
    let accessToken = sessionStorage.getItem('accessToken');
    let refreshToken = sessionStorage.getItem('refreshToken');

    console.log('📦 Session storage check:', { 
      hasUser: !!userStr, 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken 
    });

    // If not in session storage, try local storage
    if (!userStr || !accessToken) {
      userStr = localStorage.getItem('user');
      accessToken = localStorage.getItem('accessToken') || localStorage.getItem('authToken'); // Legacy support
      refreshToken = localStorage.getItem('refreshToken'); // This may be null if stored in cookies
      
      console.log('📦 Local storage check:', { 
        hasUser: !!userStr, 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken 
      });
    }

    if (userStr && accessToken) {
      try {
        const user = JSON.parse(userStr);
        console.log('👤 Parsed user:', { userId: user.userId, email: user.email });
        
        // Validate token before setting state using utility function
        const isValidTokenResult = isTokenValid(accessToken);
        console.log('🔐 Token validation result:', isValidTokenResult);

        if (isValidTokenResult) {
          set({ user, accessToken, refreshToken: refreshToken || null });
          // Set axios default Authorization header for restored session
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          console.log('✅ Session restored - Token loaded and axios headers set');
        } else {
          console.warn('❌ Stored token is expired, clearing auth state');
          sessionStorage.clear();
          localStorage.clear();
          // Clear axios headers for expired token
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Clear invalid data
        sessionStorage.clear();
        localStorage.clear();
      }
    } else {
      console.log('❌ No stored auth data found, user needs to login');
    }
  },

  setUser: (user) => set({ user }),

  setToken: (token) => set({ token }),

  setAccessToken: (accessToken) => {
    set({ accessToken });
    if (accessToken) {
      sessionStorage.setItem('accessToken', accessToken);
      localStorage.setItem('accessToken', accessToken);
      // Update axios headers for refreshed token
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      console.log('✅ Access token refreshed - axios headers updated');
    } else {
      // Clear axios headers if token is null
      delete axios.defaults.headers.common['Authorization'];
    }
  },

  updateUser: (user) => set({ user }),
}));

// Manual debugging helper - accessible from console
if (typeof window !== 'undefined') {
  (window as any).testAuth = () => {
    console.log('=== MANUAL AUTH TEST ===');
    
    // Check storage
    const localUser = localStorage.getItem('user');
    const localToken = localStorage.getItem('accessToken');
    const sessionUser = sessionStorage.getItem('user');
    const sessionToken = sessionStorage.getItem('accessToken');
    
    console.log('Storage check:', {
      localUser: localUser ? 'EXISTS' : 'MISSING',
      localToken: localToken ? 'EXISTS' : 'MISSING', 
      sessionUser: sessionUser ? 'EXISTS' : 'MISSING',
      sessionToken: sessionToken ? 'EXISTS' : 'MISSING'
    });
    
    // Test token validation
    const token = localToken || sessionToken;
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Date.now() / 1000;
          const isValid = payload.exp > currentTime;
          const timeLeft = Math.round((payload.exp - currentTime) / 60);
          
          console.log('Token analysis:', {
            isValid,
            expiresAt: new Date(payload.exp * 1000).toLocaleString(),
            minutesLeft: timeLeft,
            userId: payload.userId,
            email: payload.email
          });
        } else {
          console.log('Token format invalid');
        }
      } catch (e) {
        console.log('Token parse error:', e);
      }
    } else {
      console.log('No token found');
    }
    
    // Check Zustand state
    try {
      const state = useAuthStore.getState();
      console.log('Zustand state:', {
        hasUser: !!state.user,
        hasAccessToken: !!state.accessToken,
        userEmail: state.user?.email
      });
    } catch (e) {
      console.log('Cannot access Zustand state:', e);
    }
  };
}

export default useAuthStore;