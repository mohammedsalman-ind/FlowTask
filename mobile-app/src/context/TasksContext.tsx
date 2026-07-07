import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  archiveTask as archiveTaskRequest,
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  duplicateTask as duplicateTaskRequest,
  fetchTasks,
  updateTask as updateTaskRequest,
  updateTaskStatus,
} from '../services/taskService';
import { CreateTaskInput, Task, TaskFilter, TaskStatus, UpdateTaskInput } from '../types';

type TasksContextValue = {
  tasks: Task[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loadTasks: (filter?: TaskFilter) => Promise<void>;
  refreshTasks: (filter?: TaskFilter) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  toggleTask: (task: Task) => Promise<void>;
  duplicateTask: (task: Task) => Promise<Task>;
  archiveTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const lastLoadRef = useRef(0);

  const loadTasks = useCallback(async (filter: TaskFilter = 'all') => {
    if (loadingRef.current || Date.now() - lastLoadRef.current < 1200) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const nextTasks = await fetchTasks(filter);
      setTasks(nextTasks);
      lastLoadRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tasks.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const refreshTasks = useCallback(async (filter: TaskFilter = 'all') => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const nextTasks = await fetchTasks(filter);
      setTasks(nextTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh tasks.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    const task = await createTaskRequest(input);
    setTasks((current) => [task, ...current]);
    return task;
  }, []);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    const updated = await updateTaskRequest(id, input);
    setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
    return updated;
  }, []);

  const toggleTask = useCallback(async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    const updated = await updateTaskStatus(task.id, nextStatus);
    setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
  }, []);

  const duplicateTask = useCallback(async (task: Task) => {
    const duplicated = await duplicateTaskRequest(task);
    setTasks((current) => [duplicated, ...current]);
    return duplicated;
  }, []);

  const archiveTask = useCallback(async (task: Task) => {
    await archiveTaskRequest(task);
    setTasks((current) => current.filter((item) => item.id !== task.id));
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await deleteTaskRequest(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      loading,
      refreshing,
      error,
      loadTasks,
      refreshTasks,
      createTask,
      updateTask,
      toggleTask,
      duplicateTask,
      archiveTask,
      removeTask,
    }),
    [archiveTask, createTask, duplicateTask, error, loadTasks, loading, refreshTasks, refreshing, removeTask, tasks, toggleTask, updateTask]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within TasksProvider');
  }
  return context;
}
