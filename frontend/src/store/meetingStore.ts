import { create } from 'zustand';
import type { Meeting, ExtractedTask } from '../types';
import {
  getMeetingsApi,
  analyzeTranscriptApi,
  saveTranscriptTasksApi,
  createTasksFromMeetingApi,
  deleteMeetingApi,
} from '../api/meetings';

interface MeetingState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  isSaving: boolean;
  error: string | null;

  fetchMeetings: () => Promise<void>;
  analyzeTranscript: (title: string, file: File) => Promise<ExtractedTask[] | null>;
  saveTranscriptTasks: (
    title: string,
    fileName: string,
    tasks: ExtractedTask[]
  ) => Promise<Meeting | null>;
  createTasksFromMeeting: (meetingId: string, indices: number[]) => Promise<any[]>;
  deleteMeeting: (id: string) => Promise<boolean>;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  clearError: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meetings: [],
  currentMeeting: null,
  isLoading: false,
  isAnalyzing: false,
  isSaving: false,
  error: null,

  fetchMeetings: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await getMeetingsApi();
      if (res.error || !res.data) {
        set({ isLoading: false, error: res.error ?? 'Failed to load meetings' });
        return;
      }
      set({ meetings: res.data.meetings, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load meetings';
      set({ isLoading: false, error: msg });
    }
  },

  analyzeTranscript: async (title, file) => {
    set({ isAnalyzing: true, error: null });
    try {
      const res = await analyzeTranscriptApi(title, file);
      set({ isAnalyzing: false });
      if (res.error || !res.data) {
        set({ error: res.error ?? 'Analysis failed' });
        return null;
      }
      return res.data.tasks;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      set({ isAnalyzing: false, error: msg });
      return null;
    }
  },

  saveTranscriptTasks: async (title, fileName, tasks) => {
    set({ isSaving: true, error: null });
    try {
      const res = await saveTranscriptTasksApi(title, fileName, tasks);
      set({ isSaving: false });
      if (res.error || !res.data) {
        set({ error: res.error ?? 'Save failed' });
        return null;
      }
      const meeting = res.data.meeting;
      set((state) => ({
        meetings: [meeting, ...state.meetings],
        currentMeeting: meeting,
      }));
      return meeting;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      set({ isSaving: false, error: msg });
      return null;
    }
  },

  createTasksFromMeeting: async (meetingId, indices) => {
    try {
      const res = await createTasksFromMeetingApi(meetingId, indices);
      if (res.error || !res.data) return [];
      const createdTasks = res.data.created_tasks;

      set((state) => ({
        meetings: state.meetings.map((m) =>
          m.id === meetingId
            ? { ...m, tasks_created: [...m.tasks_created, ...createdTasks.map((t) => t.id)] }
            : m
        ),
        currentMeeting:
          state.currentMeeting?.id === meetingId
            ? {
                ...state.currentMeeting,
                tasks_created: [
                  ...state.currentMeeting.tasks_created,
                  ...createdTasks.map((t) => t.id),
                ],
              }
            : state.currentMeeting,
      }));

      return createdTasks;
    } catch {
      return [];
    }
  },

  deleteMeeting: async (id) => {
    try {
      const res = await deleteMeetingApi(id);
      if (res.error) return false;
      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
        currentMeeting: state.currentMeeting?.id === id ? null : state.currentMeeting,
      }));
      return true;
    } catch {
      return false;
    }
  },

  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
  clearError: () => set({ error: null }),
}));
