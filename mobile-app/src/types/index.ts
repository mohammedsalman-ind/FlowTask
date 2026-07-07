export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type UiTaskStatus = 'pending' | 'completed';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  due_date: string | null;
  context?: 'work' | 'personal' | 'health' | 'study';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at?: string;
  updated_at?: string;
};

export type CreateTaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  due_date: string | null;
};

export type TaskFilter = 'all' | 'pending' | 'completed' | 'high';
export type TaskSort = 'due_asc' | 'due_desc' | 'priority' | 'created_desc';
export type UpdateTaskInput = Partial<CreateTaskInput>;

export type MeetingActionItem = {
  task: string;
  assignee?: string;
  due?: string | null;
  priority?: TaskPriority;
  added?: boolean;
};

export type MeetingKeyPoint = {
  point: string;
  category: 'decision' | 'discussion' | 'blocker' | 'information' | string;
};

export type MeetingSummary = {
  summary: string;
  key_notes: MeetingKeyPoint[];
  action_items: MeetingActionItem[];
  risks?: string[];
  follow_ups?: string[];
  important_deadlines?: string[];
};

export type MeetingRecord = {
  id: string;
  user_id: string;
  title: string;
  input_type: 'transcript' | 'recording';
  raw_transcript: string;
  summary: string | null;
  key_notes: MeetingKeyPoint[];
  action_items: MeetingActionItem[];
  status: 'processing' | 'ready' | 'error';
  created_at: string;
};
