// ============================================================
// FlowTask — Frontend Types
// Re-exports shared types and adds frontend-specific types.
// ============================================================

// Re-export all shared types
export type {
  TaskStatus,
  Priority,
  Context,
  Recurrence,
  Frequency,
  GoalStatus,
  User,
  UserPreferences,
  PushSubscriptionData,
  Task,
  Habit,
  HabitCompletion,
  Goal,
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateHabitRequest,
  CreateGoalRequest,
  ParseTaskRequest,
  ParseTaskResponse,
  SuggestPriorityRequest,
  SuggestPriorityResponse,
  GoalWithProgress,
  HabitWithStats,
  // Meeting types
  MeetingInputType,
  MeetingStatus,
  NoteCategory,
  KeyNote,
  ActionItem,
  Meeting,
  AnalyzeMeetingRequest,
  AnalyzeMeetingResponse,
  ExtractedTask,
  // Notification types
  NotificationType,
  Notification,
} from '../../../shared/types/index';

// ---- Frontend-specific types ----

/** Navigation item for sidebar / bottom nav */
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

/** Toast notification config */
export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

/** View mode for task display */
export type TaskViewMode = 'list' | 'calendar' | 'board';

/** Filter state for task listing */
export interface TaskFilters {
  status: string | null;
  priority: string | null;
  context: string | null;
  search: string;
  sort_by: 'due_date' | 'priority' | 'created_at';
  sort_order: 'asc' | 'desc';
}
