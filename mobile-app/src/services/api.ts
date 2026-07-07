import axios from 'axios';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 10000,
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};
