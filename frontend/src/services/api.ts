import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject Bearer tokens automatically
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken || 
                  localStorage.getItem('access_token') || 
                  localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const deepseekKey = localStorage.getItem('deepseek_api_key');
    if (deepseekKey) {
      config.headers['X-Deepseek-Key'] = deepseekKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken || localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/auth/refresh`, { refresh: refreshToken });
          if (res.data?.access) {
            const newAccess = res.data.access;
            const newRefresh = res.data.refresh || refreshToken;
            useAuthStore.getState().setTokens(newAccess, newRefresh);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          }
        } catch (e) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
