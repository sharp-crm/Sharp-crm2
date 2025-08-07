import { useAuthStore } from '../store/useAuthStore';
import { refreshTokenRequest } from '../api/auth';
import { isTokenNearExpiration } from '../utils/token';

interface InactivityConfig {
  timeout: number; // 2 hours in milliseconds
  events: string[];
}

interface TokenRefreshConfig {
  interval: number; // 60 minutes in milliseconds
  checkInterval: number; // Check every 5 minutes
}

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private lastActivity = Date.now();
  private eventHandlers: Map<string, EventListener> = new Map();
  private isInitialized = false;

  private readonly inactivityConfig: InactivityConfig = {
    timeout: 2 * 60 * 60 * 1000, // 2 hours
    events: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  };

  private readonly tokenRefreshConfig: TokenRefreshConfig = {
    interval: 60 * 60 * 1000, // 60 minutes
    checkInterval: 5 * 60 * 1000 // Check every 5 minutes
  };

  constructor() {
    // Don't auto-initialize in constructor to avoid issues during SSR
  }

  /**
   * Initializes the auth service
   */
  public initialize(): void {
    if (this.isInitialized) return;
    
    this.setupInactivityTracking();
    this.startTokenRefreshTimer();
    this.isInitialized = true;
    console.log('🔐 Auth service initialized');
  }

  /**
   * Sets up inactivity tracking with event listeners
   */
  private setupInactivityTracking(): void {
    const resetInactivityTimer = () => {
      this.lastActivity = Date.now();
      this.resetInactivityTimer();
    };

    // Store the handler reference for cleanup
    this.eventHandlers.set('resetInactivity', resetInactivityTimer);

    // Add event listeners for user activity
    this.inactivityConfig.events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Handle visibility change (tab focus/blur)
    const visibilityHandler = () => {
      if (!document.hidden) {
        resetInactivityTimer();
      }
    };
    this.eventHandlers.set('visibilitychange', visibilityHandler);
    document.addEventListener('visibilitychange', visibilityHandler);

    // Handle window focus/blur
    const focusHandler = () => {
      resetInactivityTimer();
    };
    this.eventHandlers.set('focus', focusHandler);
    window.addEventListener('focus', focusHandler);

    const blurHandler = () => {
      // Don't reset timer on blur, but track it
      this.lastActivity = Date.now();
    };
    this.eventHandlers.set('blur', blurHandler);
    window.addEventListener('blur', blurHandler);

    // Start the initial inactivity timer
    this.resetInactivityTimer();
  }

  /**
   * Resets the inactivity timer
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout();
    }, this.inactivityConfig.timeout);
  }

  /**
   * Handles inactivity timeout by logging out the user
   */
  private handleInactivityTimeout(): void {
    console.log('🕐 Inactivity timeout reached, logging out user');
    const authStore = useAuthStore.getState();
    authStore.logout();
    
    // Redirect to login page
    window.location.href = '/login';
  }

  /**
   * Starts the token refresh timer
   */
  private startTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.tokenRefreshConfig.checkInterval);
  }

  /**
   * Checks if token needs refresh and refreshes if necessary
   */
  private async checkAndRefreshToken(): Promise<void> {
    const authStore = useAuthStore.getState();
    const { accessToken } = authStore;

    if (!accessToken) {
      return;
    }

    // Check if token is near expiration (within 5 minutes)
    if (isTokenNearExpiration(accessToken)) {
      await this.refreshToken();
    }
  }

  /**
   * Refreshes the access token with retry mechanism
   */
  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      console.log('🔄 Token refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;
    console.log('🔄 Starting automatic token refresh...');

    const maxRetries = 3;
    let retryCount = 0;

    try {
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 Calling refreshTokenRequest (attempt ${retryCount + 1}/${maxRetries})...`);
          const response = await refreshTokenRequest();
          console.log('🔄 Refresh response received:', response.status, response.data);
          
          const { accessToken, user } = response.data;

          if (!accessToken) {
            throw new Error('Invalid refresh token response - no access token');
          }

          const authStore = useAuthStore.getState();
          authStore.setAccessToken(accessToken);
          
          if (user) {
            authStore.setUser(user);
          }

          console.log('✅ Token refreshed successfully');
          return; // Success - exit the retry loop
        } catch (error: any) {
          retryCount++;
          console.error(`❌ Token refresh failed (attempt ${retryCount}/${maxRetries}):`, error);
          
          // Log more details about the error
          if (error.response) {
            console.error('❌ Response error:', {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              url: error.config?.url
            });
            
            // If it's a 404, the endpoint might not exist
            if (error.response.status === 404) {
              console.error('❌ Refresh endpoint not found. Please check if the backend is running and the endpoint is configured correctly.');
              break; // Don't retry for 404 errors
            }
            
            // If it's a 401, the refresh token might be invalid
            if (error.response.status === 401) {
              console.error('❌ Refresh token is invalid or expired. User needs to login again.');
              break; // Don't retry for 401 errors
            }
          } else if (error.request) {
            console.error('❌ Request error:', error.request);
            console.error('❌ Network error - please check if the backend is running');
          } else {
            console.error('❌ Error:', error.message);
          }
          
          // If this is the last retry, handle the failure
          if (retryCount >= maxRetries) {
            console.error('❌ Max retries reached for token refresh');
            
            // Only logout for authentication errors (401, 404) or if we have no more retries
            if (error.response?.status === 404 || error.response?.status === 401) {
              const authStore = useAuthStore.getState();
              authStore.logout();
              
              // Redirect to login page
              window.location.href = '/login';
            } else {
              // For network errors, just log the error but don't logout
              console.log('🔄 Network error during refresh - will retry later');
            }
          } else {
            // Wait before retrying (exponential backoff)
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            console.log(`🔄 Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Manually triggers a token refresh (for testing or manual refresh)
   */
  public async manualRefreshToken(): Promise<boolean> {
    try {
      await this.refreshToken();
      return true;
    } catch (error) {
      console.error('Manual token refresh failed:', error);
      return false;
    }
  }

  /**
   * Gets the current inactivity status
   */
  public getInactivityStatus(): { lastActivity: Date; timeUntilLogout: number } {
    const timeUntilLogout = this.inactivityConfig.timeout - (Date.now() - this.lastActivity);
    return {
      lastActivity: new Date(this.lastActivity),
      timeUntilLogout: Math.max(0, timeUntilLogout)
    };
  }

  /**
   * Resets the inactivity timer manually
   */
  public resetInactivity(): void {
    this.lastActivity = Date.now();
    this.resetInactivityTimer();
  }

  /**
   * Cleans up all timers and event listeners
   */
  public cleanup(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // Remove event listeners
    const resetInactivityHandler = this.eventHandlers.get('resetInactivity');
    if (resetInactivityHandler) {
      this.inactivityConfig.events.forEach(event => {
        document.removeEventListener(event, resetInactivityHandler);
      });
    }

    const visibilityHandler = this.eventHandlers.get('visibilitychange');
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }

    const focusHandler = this.eventHandlers.get('focus');
    if (focusHandler) {
      window.removeEventListener('focus', focusHandler);
    }

    const blurHandler = this.eventHandlers.get('blur');
    if (blurHandler) {
      window.removeEventListener('blur', blurHandler);
    }

    this.eventHandlers.clear();
    this.isInitialized = false;
    console.log('🔐 Auth service cleaned up');
  }
}

// Create a singleton instance
const authService = new AuthService();

export default authService; 