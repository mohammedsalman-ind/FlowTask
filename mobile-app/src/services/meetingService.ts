import axios from 'axios';
import { MeetingRecord, MeetingSummary } from '../types';
import { requireSupabaseConfig, supabase } from './supabase';

const ML_API_BASE_URL = (process.env.EXPO_PUBLIC_ML_API_BASE_URL || '').trim();

const mlApi = axios.create({
  baseURL: ML_API_BASE_URL || undefined,
  timeout: 30000,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidMeetingSummary(value: unknown): value is Pick<MeetingSummary, 'summary' | 'key_notes' | 'action_items'> {
  return (
    isRecord(value) &&
    typeof value.summary === 'string' &&
    Array.isArray(value.key_notes) &&
    Array.isArray(value.action_items)
  );
}

export async function analyzeMeeting(transcript: string, title: string): Promise<MeetingSummary> {
  if (!ML_API_BASE_URL) {
    throw new Error(
      'AI service is not configured. Set EXPO_PUBLIC_ML_API_BASE_URL in mobile-app/.env.'
    );
  }

  try {
    console.log('EXPO_PUBLIC_ML_API_BASE_URL:', ML_API_BASE_URL);
    console.log('AI meeting request URL:', `${ML_API_BASE_URL}/api/ml/analyze-meeting`);
    console.log('AI meeting transcript length:', transcript.length);

    const { data } = await mlApi.post('/api/ml/analyze-meeting', {
      transcript,
      title: title.trim() || 'Mobile meeting notes',
      input_type: 'transcript',
    });

    if (!isValidMeetingSummary(data)) {
      throw new Error('AI service returned an invalid response. Please try again.');
    }

    return {
      summary: data.summary,
      key_notes: data.key_notes,
      action_items: data.action_items,
      risks: data.key_notes
        .filter((note) => note.category === 'blocker')
        .map((note) => note.point),
      follow_ups: data.action_items.map((item) => item.task),
      important_deadlines: data.action_items
        .filter((item) => Boolean(item.due))
        .map((item) => `${item.task}: ${item.due}`),
    };
  } catch (error: any) {
    console.log('AI meeting error message:', error.message);
    console.log('AI meeting error code:', error.code);
    console.log('AI meeting error status:', error.response?.status);
    console.log('AI meeting error data:', error.response?.data);
    console.log('AI meeting error request exists:', Boolean(error.request));

    if (error instanceof Error && error.message.includes('invalid response')) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('AI service timed out. Please try again in a moment.');
      }

      if (!error.response) {
        throw new Error('Could not reach the AI service. Check your connection and try again.');
      }

      if (error.response.status >= 500) {
        throw new Error('AI service had a server error. Please try again shortly.');
      }

      const detail = isRecord(error.response.data) && typeof error.response.data.detail === 'string'
        ? error.response.data.detail
        : null;

      throw new Error(detail || 'AI service could not analyze this meeting. Please try again.');
    }

    throw new Error('AI service failed. Please try again.');
  }
}

export async function saveMeetingSummary(
  title: string,
  transcript: string,
  summary: MeetingSummary
): Promise<MeetingRecord> {
  requireSupabaseConfig();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    throw new Error('You must be signed in to save meetings.');
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      user_id: userId,
      title: title.trim() || 'Untitled meeting',
      input_type: 'transcript',
      raw_transcript: transcript,
      summary: summary.summary,
      key_notes: summary.key_notes,
      action_items: summary.action_items,
      status: 'ready',
      source_type: 'transcript',
      task_count: summary.action_items.length,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MeetingRecord;
}

export async function fetchRecentMeetings(limit = 20): Promise<MeetingRecord[]> {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from('meetings')
    .select(
      'id,user_id,title,input_type,raw_transcript,summary,key_notes,action_items,status,created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as MeetingRecord[];
}
