import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject Bearer tokens automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
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
  (error) => {
    if (error.response && error.response.status === 401) {
      // Automatic logout on token expiration
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
