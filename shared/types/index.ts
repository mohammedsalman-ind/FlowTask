// ============================================================
// FlowTask — Shared TypeScript Types
// Used by both frontend and backend packages.
// ============================================================

// ---- Enum-like Union Types ----

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'high' | 'medium' | 'low';
export type Context = 'work' | 'personal' | 'health' | 'study';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type Frequency = 'daily' | 'weekly';
export type GoalStatus = 'on_track' | 'at_risk' | 'overdue' | 'completed';

// ---- Domain Models ----

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  google_refresh_token: string | null;
  push_subscription: PushSubscriptionData | null;
  preferences: UserPreferences;
  created_at: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  timezone: string;
  working_hours_start: string; // e.g. "09:00"
  working_hours_end: string;   // e.g. "18:00"
  notification_enabled: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  due_date: string | null;
  reminder_time: string | null;
  recurrence: Recurrence;
  goal_id: string | null;
  context: Context;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  frequency: Frequency;
  target_days: number[];   // [1,2,3,4,5] = Mon–Fri
  color: string;
  icon: string;            // Emoji
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string;  // ISO date string (YYYY-MM-DD)
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  deadline: string;
  status: GoalStatus;
  color: string;
  created_at: string;
}

// ---- API Types ----

/** Standard API response wrapper. Every endpoint returns this shape. */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/** Auth request/response types */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

/** Task creation / update */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  tags?: string[];
  due_date?: string | null;
  reminder_time?: string | null;
  recurrence?: Recurrence;
  goal_id?: string | null;
  context?: Context;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
}

/** Habit creation */
export interface CreateHabitRequest {
  title: string;
  frequency: Frequency;
  target_days: number[];
  color: string;
  icon: string;
}

/** Goal creation */
export interface CreateGoalRequest {
  title: string;
  description?: string;
  deadline: string;
  color?: string;
}

/** ML API types */
export interface ParseTaskRequest {
  text: string;
}

export interface ParseTaskResponse {
  title: string;
  due_date: string | null;
  priority: Priority;
  tags: string[];
  context: Context;
}

export interface SuggestPriorityRequest {
  title: string;
  description: string;
  tags: string[];
}

export interface SuggestPriorityResponse {
  priority: Priority;
  reason: string;
}

// ---- Goal with computed progress ----

export interface GoalWithProgress extends Goal {
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
  linked_tasks: Task[];
}

// ---- Habit with streaks ----

export interface HabitWithStats extends Habit {
  current_streak: number;
  best_streak: number;
  completions: HabitCompletion[];
  completed_today: boolean;
  weekly_count: number;
  weekly_target: number;
}

// ---- Meeting Types ----

export type MeetingInputType = 'transcript' | 'recording';
export type MeetingStatus = 'processing' | 'ready' | 'error';
export type NoteCategory = 'decision' | 'discussion' | 'blocker' | 'information';

export interface KeyNote {
  point: string;
  category: NoteCategory;
}

export interface ActionItem {
  task: string;
  assignee: string;
  due: string | null;
  priority: Priority;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  input_type: MeetingInputType;
  raw_transcript: string;
  summary: string;
  key_notes: KeyNote[];
  action_items: ActionItem[];
  tasks_created: string[];
  duration_minutes: number | null;
  status: MeetingStatus;
  source_file_name?: string | null;
  task_count?: number;
  created_at: string;
}

/** Task extracted from a transcript by Gemini — not yet persisted to DB */
export interface ExtractedTask {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'todo';
  type: 'work';
  recurrence: 'one-time';
  due_date: string | null;
  tags: string[];
}

// ---- Notification Types ----

export type NotificationType =
  | 'task_due'
  | 'meeting_processed'
  | 'task_assigned';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
}

export interface AnalyzeMeetingRequest {
  title: string;
  transcript: string;
  input_type: MeetingInputType;
}

export interface AnalyzeMeetingResponse {
  summary: string;
  key_notes: KeyNote[];
  action_items: ActionItem[];
}
