-- ============================================================
-- FlowTask Database Migration
-- Run this in Supabase SQL Editor to create all tables.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
-- Note: Supabase Auth creates its own auth.users table.
-- This public.users table stores application-specific profile data.
-- It is linked to auth.users via the id column.

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  google_refresh_token TEXT,
  push_subscription    JSONB,
  preferences   JSONB NOT NULL DEFAULT '{
    "theme": "dark",
    "timezone": "UTC",
    "working_hours_start": "09:00",
    "working_hours_end": "18:00",
    "notification_enabled": true
  }'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GOALS TABLE (created before tasks due to FK dependency)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  deadline      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'on_track'
                CHECK (status IN ('on_track', 'at_risk', 'overdue', 'completed')),
  color         TEXT NOT NULL DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo', 'in_progress', 'done')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('high', 'medium', 'low')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  due_date        TIMESTAMPTZ,
  reminder_time   TIMESTAMPTZ,
  recurrence      TEXT NOT NULL DEFAULT 'none'
                  CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  goal_id         UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  context         TEXT NOT NULL DEFAULT 'personal'
                  CHECK (context IN ('work', 'personal', 'health', 'study')),
  google_event_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HABITS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  frequency     TEXT NOT NULL DEFAULT 'daily'
                CHECK (frequency IN ('daily', 'weekly')),
  target_days   INT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  color         TEXT NOT NULL DEFAULT '#6366f1',
  icon          TEXT NOT NULL DEFAULT '✅',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HABIT COMPLETIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id        UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  completed_date  DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate completions for the same habit on the same day
  UNIQUE (habit_id, completed_date)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks(user_id, context);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON public.habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON public.habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON public.habit_completions(habit_id, completed_date);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER FOR TASKS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- USERS: each user can only read/update their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- TASKS: each user can only CRUD their own tasks
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- GOALS: each user can only CRUD their own goals
CREATE POLICY "goals_select_own" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "goals_delete_own" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- HABITS: each user can only CRUD their own habits
CREATE POLICY "habits_select_own" ON public.habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "habits_insert_own" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habits_update_own" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "habits_delete_own" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

-- HABIT COMPLETIONS: each user can only CRUD their own completions
CREATE POLICY "habit_completions_select_own" ON public.habit_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "habit_completions_insert_own" ON public.habit_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habit_completions_delete_own" ON public.habit_completions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE USER PROFILE ON AUTH SIGNUP
-- This trigger creates a public.users row when a new auth.users
-- row is created (i.e., on signup).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MEETINGS (AI Meeting Assistant)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    input_type TEXT NOT NULL, -- 'transcript' | 'recording'
    raw_transcript TEXT NOT NULL,
    summary TEXT,
    key_notes JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    tasks_created JSONB DEFAULT '[]'::jsonb, -- array of task UUIDs
    duration_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing' | 'ready' | 'error'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_select_own" ON public.meetings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meetings_insert_own" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meetings_update_own" ON public.meetings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "meetings_delete_own" ON public.meetings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ADDITIVE MIGRATIONS FOR TASKS AND MEETINGS EXTENSIONS
-- ============================================================

-- Add meeting_id to tasks to link back to the meeting it originated from
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Add source_file_name, task_count, and source_type to meetings
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS source_file_name TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS task_count INTEGER DEFAULT 0;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'transcript';

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL, -- e.g. 'task_due', 'task_assigned', 'meeting_processed'
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id  UUID, -- references a task or meeting id if applicable
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_server" ON public.notifications
  FOR INSERT WITH CHECK (TRUE); -- Allow insert since backend operations run as authenticated/service-role

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

