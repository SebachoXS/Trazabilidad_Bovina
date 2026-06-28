import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});


// Interceptor de Request para inyectar token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Response — manejo simple de 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('[Network Error]', error.message || error);
    // Si es 401 en cualquier ruta que NO sea login/refresh, desloguear
    if (
      error.response?.status === 401 &&
      error.config?.url !== '/auth/login' &&
      error.config?.url !== '/auth/refresh'
    ) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);
