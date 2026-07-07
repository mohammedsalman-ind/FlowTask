import apiClient from './client';
import type {
  ApiResponse,
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatus,
} from '../types';

/** Shape of the list endpoint response */
interface TaskListResponse {
  tasks: Task[];
  total: number;
}

/** Query params accepted by GET /api/tasks */
export interface TaskFiltersParams {
  status?: TaskStatus | '';
  priority?: string;
  context?: string;
  goal_id?: string;
  search?: string;
  sort_by?: 'due_date' | 'priority' | 'created_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Fetch all tasks for the authenticated user.
 */
export async function getTasksApi(
  filters: TaskFiltersParams = {}
): Promise<ApiResponse<TaskListResponse>> {
  // Strip empty/undefined values so we don't pollute the query string
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  );
  const { data } = await apiClient.get<ApiResponse<TaskListResponse>>('/api/tasks', {
    params,
  });
  return data;
}

/**
 * Fetch a single task by ID.
 */
export async function getTaskApi(id: string): Promise<ApiResponse<{ task: Task }>> {
  const { data } = await apiClient.get<ApiResponse<{ task: Task }>>(`/api/tasks/${id}`);
  return data;
}

/**
 * Create a new task.
 */
export async function createTaskApi(
  payload: CreateTaskRequest
): Promise<ApiResponse<{ task: Task }>> {
  const { data } = await apiClient.post<ApiResponse<{ task: Task }>>('/api/tasks', payload);
  return data;
}

/**
 * Update a task (full replace of provided fields).
 */
export async function updateTaskApi(
  id: string,
  payload: Omit<UpdateTaskRequest, 'id'>
): Promise<ApiResponse<{ task: Task }>> {
  const { data } = await apiClient.put<ApiResponse<{ task: Task }>>(
    `/api/tasks/${id}`,
    payload
  );
  return data;
}

/**
 * Quick-patch just the status (Kanban drag-and-drop).
 */
export async function patchTaskStatusApi(
  id: string,
  status: TaskStatus
): Promise<ApiResponse<{ task: Task }>> {
  const { data } = await apiClient.patch<ApiResponse<{ task: Task }>>(
    `/api/tasks/${id}/status`,
    { status }
  );
  return data;
}

/**
 * Delete a task by ID.
 */
export async function deleteTaskApi(
  id: string
): Promise<ApiResponse<{ message: string }>> {
  const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(
    `/api/tasks/${id}`
  );
  return data;
}
