// Utility functions for authentication
export const isTokenExpired = (token: string): boolean => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

export const getTokenPayload = (token: string) => {
  if (!token) return null;
  
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    console.error('Error parsing token payload:', error);
    return null;
  }
};

export const clearAllTokens = () => {
  // Clear from all possible storage locations
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('loggedIn');
  
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
  
  sessionStorage.clear();
  localStorage.clear();
};

export const validateStoredTokens = () => {
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  
  if (!accessToken || !refreshToken) {
    console.warn('Missing tokens in storage');
    return false;
  }
  
  if (isTokenExpired(accessToken)) {
    console.warn('Access token is expired');
    return false;
  }
  
  return true;
}; 