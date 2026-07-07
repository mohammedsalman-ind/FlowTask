import apiClient from './client';
import type { ApiResponse, Notification } from '../types';

interface NotificationsPayload {
  notifications: Notification[];
  unread_count: number;
}

/**
 * Fetch all notifications for the user.
 */
export async function getNotificationsApi(): Promise<ApiResponse<NotificationsPayload>> {
  const { data } = await apiClient.get<ApiResponse<NotificationsPayload>>('/api/notifications');
  return data;
}

/**
 * Mark all notifications as read.
 */
export async function markAllReadApi(): Promise<ApiResponse<{ message: string }>> {
  const { data } = await apiClient.patch<ApiResponse<{ message: string }>>('/api/notifications/read-all');
  return data;
}

/**
 * Mark a single notification as read by ID.
 */
export async function markReadApi(id: string): Promise<ApiResponse<{ notification: Notification }>> {
  const { data } = await apiClient.patch<ApiResponse<{ notification: Notification }>>(`/api/notifications/${id}/read`);
  return data;
}
