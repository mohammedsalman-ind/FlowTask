import apiClient from './client';
import type {
  ApiResponse,
  Meeting,
  ExtractedTask,
} from '../types';

/** Shape of the list endpoint response */
interface MeetingListResponse {
  meetings: Meeting[];
}

/**
 * Fetch all meetings for the authenticated user.
 */
export async function getMeetingsApi(): Promise<ApiResponse<MeetingListResponse>> {
  const { data } = await apiClient.get<ApiResponse<MeetingListResponse>>('/api/meetings');
  return data;
}

/**
 * Fetch a single meeting by ID.
 */
export async function getMeetingApi(id: string): Promise<ApiResponse<{ meeting: Meeting }>> {
  const { data } = await apiClient.get<ApiResponse<{ meeting: Meeting }>>(`/api/meetings/${id}`);
  return data;
}

/**
 * Analyze a transcript file via the backend → ML API → Gemini.
 * Returns extracted tasks (not yet saved) for the preview step.
 */
export async function analyzeTranscriptApi(
  meetingTitle: string,
  file: File
): Promise<ApiResponse<{ tasks: ExtractedTask[] }>> {
  const formData = new FormData();
  formData.append('meeting_title', meetingTitle);
  formData.append('file', file);

  const { data } = await apiClient.post<ApiResponse<{ tasks: ExtractedTask[] }>>(
    '/api/meetings/analyze',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
  );
  return data;
}

/**
 * Save confirmed tasks + meeting record to Supabase after user approves the preview.
 */
export async function saveTranscriptTasksApi(
  meetingTitle: string,
  sourceFileName: string,
  tasks: ExtractedTask[]
): Promise<ApiResponse<{ meeting: Meeting; tasks_created: number }>> {
  const { data } = await apiClient.post<ApiResponse<{ meeting: Meeting; tasks_created: number }>>(
    '/api/meetings/save',
    { meeting_title: meetingTitle, source_file_name: sourceFileName, tasks }
  );
  return data;
}

/**
 * Create tasks from selected action items of a meeting (legacy / existing meetings).
 */
export async function createTasksFromMeetingApi(
  meetingId: string,
  actionItemIndices: number[]
): Promise<ApiResponse<{ created_tasks: any[] }>> {
  const { data } = await apiClient.post<ApiResponse<{ created_tasks: any[] }>>(
    `/api/meetings/${meetingId}/create-tasks`,
    { action_item_indices: actionItemIndices }
  );
  return data;
}

/**
 * Delete a meeting.
 */
export async function deleteMeetingApi(
  id: string
): Promise<ApiResponse<{ message: string }>> {
  const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/meetings/${id}`);
  return data;
}
