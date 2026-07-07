-- ============================================================
-- FlowTask Patch Migration: Add Missing Columns
-- Run this in Supabase SQL Editor if you see errors like:
--   "Could not find the 'meeting_id' column of 'tasks'"
--   "Could not find the 'source_file_name' column of 'meetings'"
-- ============================================================

-- Add meeting_id to tasks to link back to the meeting it originated from
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Add source_file_name, task_count, and source_type to meetings
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS source_file_name TEXT;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS task_count INTEGER DEFAULT 0;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'transcript';

-- After running this, the backend will automatically use these columns.
-- No code changes are needed once this patch is applied.
