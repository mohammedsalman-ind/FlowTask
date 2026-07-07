import { create } from 'zustand';
import type { User } from '../types';
import { loginApi, registerApi, logoutApi, getMeApi, updateProfileApi } from '../api/auth';

interface AuthState {
  /** The currently authenticated user, or null */
  user: User | null;
  /** The JWT access token */
  token: string | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  /** The last auth error message */
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  checkAuth: () => Promise<void>;
  updateProfile: (name: string, avatar_url?: string | null) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Zustand auth store.
 *
 * Manages user authentication state, persists the JWT token in localStorage,
 * and provides login/register/logout actions.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('flowtask_token'),
  isAuthenticated: !!localStorage.getItem('flowtask_token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginApi(email, password);

      if (response.error || !response.data) {
        set({ isLoading: false, error: response.error || 'Login failed' });
        return false;
      }

      const { user, access_token, refresh_token } = response.data;

      // Persist tokens
      localStorage.setItem('flowtask_token', access_token);
      if (refresh_token) {
        localStorage.setItem('flowtask_refresh_token', refresh_token);
      }

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  register: async (
    email: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await registerApi(email, password, name);

      if (response.error || !response.data) {
        set({ isLoading: false, error: response.error || 'Registration failed' });
        return false;
      }

      const { user, access_token, refresh_token } = response.data;

      // Persist tokens
      if (access_token) {
        localStorage.setItem('flowtask_token', access_token);
      }
      if (refresh_token) {
        localStorage.setItem('flowtask_refresh_token', refresh_token);
      }

      set({
        user,
        token: access_token,
        isAuthenticated: !!access_token,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore errors — clear local state regardless
    }

    // Clear persisted tokens
    localStorage.removeItem('flowtask_token');
    localStorage.removeItem('flowtask_refresh_token');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('flowtask_token');

    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await getMeApi();

      if (response.error || !response.data) {
        // Token is invalid — clear everything
        localStorage.removeItem('flowtask_token');
        localStorage.removeItem('flowtask_refresh_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      set({
        user: response.data.user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('flowtask_token');
      localStorage.removeItem('flowtask_refresh_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  updateProfile: async (name: string, avatar_url?: string | null): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateProfileApi(name, avatar_url);
      if (response.error || !response.data) {
        set({ isLoading: false, error: response.error || 'Failed to update profile' });
        return false;
      }
      set({ user: response.data.user, isLoading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      set({ isLoading: false, error: message });
      return false;
    }
  },
}));
