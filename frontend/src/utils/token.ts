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
