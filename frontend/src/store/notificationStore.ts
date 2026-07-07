import { create } from 'zustand';
import type { Notification } from '../types';
import {
  getNotificationsApi,
  markAllReadApi,
  markReadApi,
} from '../api/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;

  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  toggleOpen: (open?: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await getNotificationsApi();
      if (res.error || !res.data) {
        set({ isLoading: false });
        return;
      }
      set({
        notifications: res.data.notifications,
        unreadCount: res.data.unread_count,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      set({ isLoading: false });
    }
  },

  markAllAsRead: async () => {
    // Optimistic update
    const previousNotifications = get().notifications;
    const updated = previousNotifications.map((n) => ({ ...n, is_read: true }));
    set({ notifications: updated, unreadCount: 0 });

    try {
      const res = await markAllReadApi();
      if (res.error) {
        // Rollback
        set({ notifications: previousNotifications, unreadCount: previousNotifications.filter(n => !n.is_read).length });
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
      set({ notifications: previousNotifications, unreadCount: previousNotifications.filter(n => !n.is_read).length });
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    const previousNotifications = get().notifications;
    let found = false;
    const updated = previousNotifications.map((n) => {
      if (n.id === id && !n.is_read) {
        found = true;
        return { ...n, is_read: true };
      }
      return n;
    });

    if (found) {
      set((state) => ({
        notifications: updated,
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    }

    try {
      const res = await markReadApi(id);
      if (res.error) {
        // Rollback
        set({ notifications: previousNotifications, unreadCount: previousNotifications.filter(n => !n.is_read).length });
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
      set({ notifications: previousNotifications, unreadCount: previousNotifications.filter(n => !n.is_read).length });
    }
  },

  toggleOpen: (open) => {
    set((state) => ({ isOpen: open !== undefined ? open : !state.isOpen }));
  },
}));
