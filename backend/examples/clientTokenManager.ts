/**
 * Client-side Token Manager
 * This is an example implementation for frontend integration
 * 
 * Features:
 * - Automatic token refresh before expiry
 * - Secure token storage (memory + HTTP-only cookies recommended)
 * - Request interception for token handling
 * - Logout and cleanup functionality
 */

interface TokenData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

class TokenManager {
  private tokenData: TokenData | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly API_BASE_URL: string;
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  constructor(apiBaseUrl?: string) {
    this.API_BASE_URL = apiBaseUrl || API_CONFIG.BASE_URL;
    this.loadTokensFromStorage();
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Login failed' };
      }

      const data = await response.json();
      
      this.tokenData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiry: data.accessTokenExpiry,
        refreshTokenExpiry: data.refreshTokenExpiry,
      };

      this.saveTokensToStorage();
      this.scheduleTokenRefresh();

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(): Promise<boolean> {
    if (!this.tokenData?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.tokenData.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      
      this.tokenData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiry: data.accessTokenExpiry,
        refreshTokenExpiry: data.refreshTokenExpiry,
      };

      this.saveTokensToStorage();
      this.scheduleTokenRefresh();

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Auto-refresh tokens if needed
   */
  async autoRefreshTokens(): Promise<boolean> {
    if (!this.tokenData?.accessToken || !this.tokenData?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/auto-refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: this.tokenData.accessToken,
          refreshToken: this.tokenData.refreshToken,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      if (data.shouldRefresh) {
        this.tokenData = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpiry: data.accessTokenExpiry,
          refreshTokenExpiry: data.refreshTokenExpiry,
        };

        this.saveTokensToStorage();
        this.scheduleTokenRefresh();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Auto-refresh failed:', error);
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      if (this.tokenData?.refreshToken) {
        await fetch(`${this.API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            refreshToken: this.tokenData.refreshToken,
            userId: this.getCurrentUser()?.userId
          }),
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokenData?.accessToken || null;
  }

  /**
   * Get current user from token
   */
  getCurrentUser(): User | null {
    if (!this.tokenData?.accessToken) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(this.tokenData.accessToken.split('.')[1]));
      return {
        userId: payload.userId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        tenantId: payload.tenantId,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokenData?.accessToken && !this.isTokenExpired(this.tokenData.accessToken);
  }

  /**
   * Make authenticated API request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Auto-refresh if needed
    await this.autoRefreshTokens();

    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    // Check for token refresh recommendations from server
    const shouldRefresh = response.headers.get('X-Token-Refresh-Recommended');
    if (shouldRefresh === 'true') {
      await this.refreshTokens();
    }

    return response;
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenData?.accessTokenExpiry) {
      return;
    }

    const timeUntilRefresh = this.tokenData.accessTokenExpiry - Date.now() - this.REFRESH_THRESHOLD;
    
    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokens();
      }, timeUntilRefresh);
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  }

  /**
   * Save tokens to storage (implement based on your security requirements)
   */
  private saveTokensToStorage(): void {
    if (typeof window !== 'undefined' && this.tokenData) {
      // Option 1: Memory only (most secure, but doesn't persist)
      // No storage needed - tokens are already in memory
      
      // Option 2: Secure storage (recommended)
      // Use secure HTTP-only cookies for refresh token
      // Keep access token in memory only
      
      // Option 3: localStorage (less secure, but convenient for demo)
      // localStorage.setItem('tokens', JSON.stringify(this.tokenData));
    }
  }

  /**
   * Load tokens from storage
   */
  private loadTokensFromStorage(): void {
    if (typeof window !== 'undefined') {
      // Load from your chosen storage method
      // const stored = localStorage.getItem('tokens');
      // if (stored) {
      //   this.tokenData = JSON.parse(stored);
      //   this.scheduleTokenRefresh();
      // }
    }
  }

  /**
   * Clear all tokens
   */
  private clearTokens(): void {
    this.tokenData = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // Clear from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tokens');
    }
  }
}

// Usage example
const tokenManager = new TokenManager();

// Login
async function login(email: string, password: string) {
  const result = await tokenManager.login(email, password);
  if (result.success) {
    console.log('Logged in successfully:', result.user);
  } else {
    console.error('Login failed:', result.error);
  }
}

// Make authenticated requests
async function getProtectedData() {
  try {
    const response = await tokenManager.authenticatedFetch('/api/protected-endpoint');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Logout
async function logout() {
  await tokenManager.logout();
  console.log('Logged out successfully');
}

export default TokenManager;
