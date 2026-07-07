import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

/**
 * Axios instance pre-configured for the FlowTask Node API.
 *
 * - Base URL from environment variable
 * - Auto-attaches Bearer token from localStorage
 * - Handles 401 responses by clearing auth state
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_NODE_API_URL || 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ---- Request interceptor: attach auth token ----
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('flowtask_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ---- Response interceptor: handle auth errors ----
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<null>>) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth and redirect
      localStorage.removeItem('flowtask_token');
      localStorage.removeItem('flowtask_refresh_token');

      // Only redirect if not already on auth pages
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
