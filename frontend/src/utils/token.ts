import { refreshToken } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';

export const attemptTokenRefresh = async () => {
  const token = sessionStorage.getItem('refreshToken');
  if (!token) return false;

  try {
    const res = await refreshToken(token);
    const newData = res.data.data;
    useAuthStore.getState().login(newData);
    return true;
  } catch (err) {
    console.error('Refresh failed', err);
    useAuthStore.getState().logout();
    return false;
  }
};
