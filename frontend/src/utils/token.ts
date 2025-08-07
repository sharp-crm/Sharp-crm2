import { refreshTokenRequest } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Validates if a JWT token is valid and not expired
 * @param token - The JWT token to validate
 * @returns boolean indicating if token is valid
 */
export const isTokenValid = (token: string | null): boolean => {
  if (!token) {
    console.log('🔐 Token validation: token is null/empty');
    return false;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('🔐 Token validation: invalid format, parts:', parts.length);
      return false;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Date.now() / 1000;
    const isValid = payload.exp > currentTime;
    
    console.log('🔐 Token validation details:', {
      exp: payload.exp,
      currentTime,
      expiryDate: new Date(payload.exp * 1000),
      isValid,
      timeUntilExpiry: Math.round(payload.exp - currentTime)
    });
    
    return isValid;
  } catch (error) {
    console.log('🔐 Token validation error:', error);
    return false;
  }
};

/**
 * Extracts token payload without validation
 * @param token - The JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export const decodeToken = (token: string | null): any => {
  if (!token) return null;
  
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

/**
 * Gets token expiration time
 * @param token - The JWT token
 * @returns Expiration time as Date object or null
 */
export const getTokenExpiration = (token: string | null): Date | null => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return null;
  
  return new Date(payload.exp * 1000);
};

/**
 * Checks if token is close to expiration (within 5 minutes)
 * @param token - The JWT token
 * @returns boolean indicating if token is near expiration
 */
export const isTokenNearExpiration = (token: string | null): boolean => {
  if (!token) return true;
  
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  
  const currentTime = Date.now() / 1000;
  const fiveMinutes = 5 * 60; // 5 minutes in seconds
  
  return (payload.exp - currentTime) < fiveMinutes;
};

/**
 * Gets refresh token information from cookies or storage
 * @returns Refresh token information or null
 */
export const getRefreshTokenInfo = (): { token: string | null; payload: any; expiry: Date | null } | null => {
  // Try to get refresh token from cookies (primary method)
  const cookies = document.cookie.split(';');
  let refreshToken = null;
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'refreshToken') {
      refreshToken = value;
      break;
    }
  }
  
  // If not in cookies, try storage (fallback)
  if (!refreshToken) {
    refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
  }
  
  if (!refreshToken) {
    return null;
  }
  
  const payload = decodeToken(refreshToken);
  const expiry = payload?.exp ? new Date(payload.exp * 1000) : null;
  
  return {
    token: refreshToken,
    payload,
    expiry
  };
};

/**
 * Checks if refresh token is valid and not expired
 * @returns boolean indicating if refresh token is valid
 */
export const isRefreshTokenValid = (): boolean => {
  const refreshTokenInfo = getRefreshTokenInfo();
  if (!refreshTokenInfo) return false;
  
  const { payload, expiry } = refreshTokenInfo;
  if (!payload || !expiry) return false;
  
  const currentTime = new Date();
  return expiry > currentTime;
};

/**
 * Gets refresh token expiration details
 * @returns Object with refresh token expiration information
 */
export const getRefreshTokenExpiryInfo = (): {
  isValid: boolean;
  expiryDate: Date | null;
  timeUntilExpiry: number | null;
  daysLeft: number | null;
  hoursLeft: number | null;
  minutesLeft: number | null;
} | null => {
  const refreshTokenInfo = getRefreshTokenInfo();
  if (!refreshTokenInfo) {
    return {
      isValid: false,
      expiryDate: null,
      timeUntilExpiry: null,
      daysLeft: null,
      hoursLeft: null,
      minutesLeft: null
    };
  }
  
  const { payload, expiry } = refreshTokenInfo;
  if (!payload || !expiry) {
    return {
      isValid: false,
      expiryDate: null,
      timeUntilExpiry: null,
      daysLeft: null,
      hoursLeft: null,
      minutesLeft: null
    };
  }
  
  const currentTime = new Date();
  const timeUntilExpiry = expiry.getTime() - currentTime.getTime();
  const isValid = timeUntilExpiry > 0;
  
  const daysLeft = Math.floor(timeUntilExpiry / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeUntilExpiry % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    isValid,
    expiryDate: expiry,
    timeUntilExpiry,
    daysLeft,
    hoursLeft,
    minutesLeft
  };
};

/**
 * Attempts to refresh the access token using the refresh token
 * @returns Promise<boolean> indicating success
 */
export const attemptTokenRefresh = async (): Promise<boolean> => {
  try {
    const res = await refreshTokenRequest();
    const { accessToken, user } = res.data;
    
    if (!accessToken) {
      throw new Error('No access token in refresh response');
    }
    
    const authStore = useAuthStore.getState();
    authStore.setAccessToken(accessToken);
    
    if (user) {
      authStore.setUser(user);
    }
    
    console.log('✅ Token refreshed successfully');
    return true;
  } catch (err) {
    console.error('❌ Token refresh failed:', err);
    useAuthStore.getState().logout();
    return false;
  }
};

/**
 * Debug function to log all token information
 * @returns Object with comprehensive token information
 */
export const debugTokenInfo = () => {
  const accessToken = useAuthStore.getState().accessToken || 
                     sessionStorage.getItem('accessToken') || 
                     localStorage.getItem('accessToken');
  
  const refreshTokenInfo = getRefreshTokenInfo();
  const refreshTokenExpiryInfo = getRefreshTokenExpiryInfo();
  
  const accessTokenInfo = accessToken ? {
    token: accessToken.substring(0, 20) + '...',
    payload: decodeToken(accessToken),
    expiry: getTokenExpiration(accessToken),
    isValid: isTokenValid(accessToken),
    isNearExpiration: isTokenNearExpiration(accessToken)
  } : null;
  
  const debugInfo = {
    accessToken: accessTokenInfo,
    refreshToken: refreshTokenInfo ? {
      token: refreshTokenInfo.token?.substring(0, 20) + '...',
      payload: refreshTokenInfo.payload,
      expiry: refreshTokenInfo.expiry,
      ...refreshTokenExpiryInfo
    } : null,
    summary: {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshTokenInfo,
      accessTokenValid: accessTokenInfo?.isValid || false,
      refreshTokenValid: refreshTokenExpiryInfo?.isValid || false,
      canRefresh: refreshTokenExpiryInfo?.isValid || false
    }
  };
  
  console.log('🔐 Debug Token Information:', debugInfo);
  return debugInfo;
};

/**
 * Test function to verify refresh endpoint is accessible
 * @returns Promise<boolean> indicating if endpoint is accessible
 */
export const testRefreshEndpoint = async (): Promise<boolean> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const testUrl = `${API_URL}/auth/refresh`;
    
    console.log('🧪 Testing refresh endpoint:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({})
    });
    
    console.log('🧪 Test response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('🧪 Test response data:', data);
      return true;
    } else {
      console.log('🧪 Test failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('🧪 Test error:', error);
    return false;
  }
};
