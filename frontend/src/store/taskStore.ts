import { create } from 'zustand';
import type { Task, TaskStatus, CreateTaskRequest, UpdateTaskRequest } from '../types';
import {
  getTasksApi,
  createTaskApi,
  updateTaskApi,
  patchTaskStatusApi,
  deleteTaskApi,
  type TaskFiltersParams,
} from '../api/tasks';

// ---- State shape ----

interface TaskState {
  /** All tasks for the current user */
  tasks: Task[];
  /** Total count from the server (for pagination) */
  total: number;
  /** Whether a list fetch is in progress */
  isLoading: boolean;
  /** Whether a create/update/delete mutation is in progress */
  isMutating: boolean;
  /** The last error message */
  error: string | null;
  /** Currently active filters */
  filters: TaskFiltersParams;

  // ---- Actions ----
  fetchTasks: (filters?: TaskFiltersParams) => Promise<void>;
  createTask: (payload: CreateTaskRequest) => Promise<Task | null>;
  updateTask: (id: string, payload: Omit<UpdateTaskRequest, 'id'>) => Promise<Task | null>;
  patchStatus: (id: string, status: TaskStatus) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  setFilters: (filters: Partial<TaskFiltersParams>) => void;
  clearError: () => void;
}

// ---- Computed helpers ----

/** Group tasks into Kanban columns */
export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  return {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  };
}

// ---- Store ----

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,
  isLoading: false,
  isMutating: false,
  error: null,
  filters: {
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: 200,
  },

  // ---- Fetch ----

  fetchTasks: async (overrides?: TaskFiltersParams) => {
    const filters = { ...get().filters, ...overrides };
    set({ isLoading: true, error: null, filters });
    try {
      const res = await getTasksApi(filters);
      if (res.error || !res.data) {
        set({ isLoading: false, error: res.error ?? 'Failed to load tasks' });
        return;
      }
      set({ tasks: res.data.tasks, total: res.data.total, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      set({ isLoading: false, error: msg });
    }
  },

  // ---- Create ----

  createTask: async (payload) => {
    set({ isMutating: true, error: null });
    try {
      const res = await createTaskApi(payload);
      if (res.error || !res.data) {
        set({ isMutating: false, error: res.error ?? 'Failed to create task' });
        return null;
      }
      const newTask = res.data.task;
      // Prepend to local state — no refetch needed
      set((state) => ({
        tasks: [newTask, ...state.tasks],
        total: state.total + 1,
        isMutating: false,
      }));
      return newTask;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      set({ isMutating: false, error: msg });
      return null;
    }
  },

  // ---- Update ----

  updateTask: async (id, payload) => {
    set({ isMutating: true, error: null });
    try {
      const res = await updateTaskApi(id, payload);
      if (res.error || !res.data) {
        set({ isMutating: false, error: res.error ?? 'Failed to update task' });
        return null;
      }
      const updated = res.data.task;
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        isMutating: false,
      }));
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update task';
      set({ isMutating: false, error: msg });
      return null;
    }
  },

  // ---- Patch Status (optimistic) ----

  patchStatus: async (id, status) => {
    // Optimistic update — swap status immediately
    const previous = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));

    try {
      const res = await patchTaskStatusApi(id, status);
      if (res.error || !res.data) {
        // Roll back
        set({ tasks: previous, error: res.error ?? 'Failed to update status' });
        return null;
      }
      const updated = res.data.task;
      // Sync with server-returned value
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
      }));
      return updated;
    } catch (err) {
      // Roll back
      set({ tasks: previous, error: 'Failed to update status' });
      return null;
    }
  },

  // ---- Delete ----

  deleteTask: async (id) => {
    set({ isMutating: true, error: null });
    try {
      const res = await deleteTaskApi(id);
      if (res.error) {
        set({ isMutating: false, error: res.error });
        return false;
      }
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        total: Math.max(0, state.total - 1),
        isMutating: false,
      }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete task';
      set({ isMutating: false, error: msg });
      return false;
    }
  },

  // ---- Filters ----

  setFilters: (partial) => {
    set((state) => ({ filters: { ...state.filters, ...partial } }));
  },

  clearError: () => set({ error: null }),
}));
