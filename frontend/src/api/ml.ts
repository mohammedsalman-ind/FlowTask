import axios from 'axios';
import type { ParseTaskRequest, ParseTaskResponse } from '../types';

/**
 * Axios instance pre-configured for the FlowTask ML API.
 */
const mlApiClient = axios.create({
  baseURL: import.meta.env.VITE_ML_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Parses natural language text into structured task data.
 */
export async function parseTaskText(text: string): Promise<ParseTaskResponse | null> {
  try {
    const payload: ParseTaskRequest = { text };
    const { data } = await mlApiClient.post<ParseTaskResponse>('/api/ml/parse', payload);
    return data;
  } catch (error) {
    console.error('Failed to parse task via ML API:', error);
    return null;
  }
}
