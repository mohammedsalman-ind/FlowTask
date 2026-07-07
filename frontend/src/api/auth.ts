import apiClient from './client';
import type { ApiResponse, AuthResponse, User } from '../types';

/**
 * Auth API functions.
 * All functions call the Node API auth endpoints.
 */

export async function loginApi(
  email: string,
  password: string
): Promise<ApiResponse<AuthResponse>> {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
    '/api/auth/login',
    { email, password }
  );
  return data;
}

export async function registerApi(
  email: string,
  password: string,
  name: string
): Promise<ApiResponse<AuthResponse>> {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
    '/api/auth/register',
    { email, password, name }
  );
  return data;
}

export async function logoutApi(): Promise<ApiResponse<{ message: string }>> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    '/api/auth/logout'
  );
  return data;
}

export async function getMeApi(): Promise<ApiResponse<{ user: User }>> {
  const { data } = await apiClient.get<ApiResponse<{ user: User }>>(
    '/api/auth/me'
  );
  return data;
}

export async function refreshTokenApi(
  refreshToken: string
): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
  const { data } = await apiClient.post<
    ApiResponse<{ access_token: string; refresh_token: string }>
  >('/api/auth/refresh', { refresh_token: refreshToken });
  return data;
}

export async function updateProfileApi(
  name: string,
  avatar_url?: string | null
): Promise<ApiResponse<{ user: User }>> {
  const { data } = await apiClient.patch<ApiResponse<{ user: User }>>(
    '/api/auth/profile',
    { name, avatar_url }
  );
  return data;
}

