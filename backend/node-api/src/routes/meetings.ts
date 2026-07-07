import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { supabaseAdmin } from '../db/supabase.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All meeting routes require authentication
router.use(authMiddleware);

// ---- Zod Schemas ----

const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  transcript: z.string().min(1, 'Transcript is required'),
  input_type: z.enum(['transcript', 'recording']),
});

const createTasksSchema = z.object({
  action_item_indices: z.array(z.number().int().min(0)),
});

const saveTasksSchema = z.object({
  meeting_title: z.string().min(1, 'Meeting title is required'),
  source_file_name: z.string().min(1, 'Source file name is required'),
  tasks: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional().default(''),
      priority: z.enum(['High', 'Medium', 'Low']),
      status: z.enum(['todo', 'in_progress', 'done']).optional().default('todo'),
      type: z.string().optional().default('work'),
      recurrence: z.string().optional().default('one-time'),
      due_date: z.string().nullable().optional(),
      tags: z.array(z.string()).optional().default([]),
    })
  ),
});

// ---- ML API base URL ----

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

// ---- Routes ----

/**
 * POST /api/meetings/analyze
 * Pass-through endpoint that forwards the file upload to the Python ML API for Gemini analysis.
 */
router.post('/analyze', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const meetingTitle = req.body.meeting_title;
    if (!meetingTitle) {
      res.status(400).json({ data: null, error: 'Meeting title is required', status: 400 });
      return;
    }

    if (!req.file) {
      res.status(400).json({ data: null, error: 'No transcript file provided', status: 400 });
      return;
    }

    // Forward multipart data to ML API using native fetch (Node 18+)
    const formData = new FormData();
    formData.append('meeting_title', meetingTitle);
    
    // Construct Blob from buffer
    const fileBlob = new Blob([req.file.buffer as any], { type: req.file.mimetype });
    formData.append('file', fileBlob, req.file.originalname);

    const mlResponse = await fetch(`${ML_API_URL}/api/ml/analyze-transcript`, {
      method: 'POST',
      body: formData,
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      console.error('ML API Error response:', errText);
      res.status(mlResponse.status).json({ data: null, error: `AI analysis service failed: ${errText}`, status: mlResponse.status });
      return;
    }

    const analysis = await mlResponse.json();
    res.status(200).json({ data: analysis, error: null, status: 200 });

  } catch (err) {
    console.error('POST /api/meetings/analyze error:', err);
    res.status(500).json({ data: null, error: 'Internal server error during analysis', status: 500 });
  }
});

/**
 * POST /api/meetings/save
 * Bulk inserts confirmed tasks into DB and creates a meeting record + notification.
 */
router.post('/save', validate(saveTasksSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { meeting_title, source_file_name, tasks } = req.body as z.infer<typeof saveTasksSchema>;

    // 1. Create meeting record in public.meetings table
    // We set status to 'ready' directly since tasks are already analyzed
    // IMPORTANT: Requires database/patch_meeting_columns.sql to have been run in Supabase.
    const { data: meeting, error: insertMeetingErr } = await supabaseAdmin
      .from('meetings')
      .insert({
        user_id: userId,
        title: meeting_title,
        input_type: 'transcript',
        raw_transcript: `Uploaded file: ${source_file_name}`,
        summary: `${tasks.length} task(s) successfully extracted from this meeting.`,
        key_notes: [],
        action_items: tasks.map(t => ({
          task: t.title,
          due: t.due_date,
          priority: t.priority.toLowerCase(),
          assignee: 'Self'
        })),
        status: 'ready',
        source_file_name,
        task_count: tasks.length,
        source_type: 'transcript'
      })
      .select()
      .single();

    if (insertMeetingErr || !meeting) {
      res.status(400).json({ data: null, error: insertMeetingErr?.message ?? 'Failed to save meeting record', status: 400 });
      return;
    }

    const insertedTaskIds: string[] = [];

    // 2. Bulk insert tasks to the public.tasks table
    // IMPORTANT: Requires database/patch_meeting_columns.sql to have been run in Supabase.
    if (tasks.length > 0) {
      const tasksPayload = tasks.map(task => ({
        user_id: userId,
        meeting_id: meeting.id,
        title: task.title,
        description: task.description || '',
        status: 'todo',
        priority: task.priority.toLowerCase() as 'high' | 'medium' | 'low',
        tags: task.tags || [],
        due_date: task.due_date || null,
        context: 'work',
        recurrence: 'none'
      }));

      const { data: insertedTasks, error: insertTasksErr } = await supabaseAdmin
        .from('tasks')
        .insert(tasksPayload)
        .select('id');

      if (insertTasksErr) {
        console.error('Error inserting tasks:', insertTasksErr);
        // We still keep the meeting but report task failure
        res.status(201).json({
          data: { meeting, tasks_created: 0 },
          error: 'Saved meeting but failed to create some tasks.',
          status: 201
        });
        return;
      }

      if (insertedTasks) {
        insertedTaskIds.push(...insertedTasks.map(t => t.id));
      }
    }

    // 3. Update tasks_created list in the meetings table
    await supabaseAdmin
      .from('meetings')
      .update({ tasks_created: insertedTaskIds })
      .eq('id', meeting.id);

    // 4. Trigger notification
    const notificationMessage = `${tasks.length} tasks extracted from '${meeting_title}'`;
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        message: notificationMessage,
        type: 'meeting_processed',
        reference_id: meeting.id
      });

    res.status(201).json({
      data: { meeting: { ...meeting, tasks_created: insertedTaskIds }, tasks_created: tasks.length },
      error: null,
      status: 201
    });

  } catch (err) {
    console.error('POST /api/meetings/save error:', err);
    res.status(500).json({ data: null, error: 'Internal server error saving tasks', status: 500 });
  }
});

/**
 * POST /api/meetings
 * Create a new meeting (legacy / text-based analysis).
 */
router.post('/', validate(createMeetingSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, transcript, input_type } = req.body as z.infer<typeof createMeetingSchema>;

    const { data: meeting, error: insertError } = await supabaseAdmin
      .from('meetings')
      .insert({
        user_id: userId,
        title,
        raw_transcript: transcript,
        input_type,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError || !meeting) {
      res.status(400).json({ data: null, error: insertError?.message ?? 'Failed to create meeting', status: 400 });
      return;
    }

    try {
      const mlResponse = await fetch(`${ML_API_URL}/api/ml/analyze-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, title, input_type }),
      });

      if (!mlResponse.ok) {
        throw new Error(`ML API returned ${mlResponse.status}`);
      }

      const analysis = await mlResponse.json();

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('meetings')
        .update({
          summary: analysis.summary || '',
          key_notes: analysis.key_notes || [],
          action_items: analysis.action_items || [],
          status: 'ready',
        })
        .eq('id', meeting.id)
        .select()
        .single();

      if (updateError) {
        res.status(200).json({ data: { meeting }, error: null, status: 200 });
        return;
      }

      res.status(201).json({ data: { meeting: updated }, error: null, status: 201 });
    } catch (mlError) {
      console.error('ML API analysis failed:', mlError);
      await supabaseAdmin
        .from('meetings')
        .update({ status: 'error' })
        .eq('id', meeting.id);

      res.status(201).json({
        data: { meeting: { ...meeting, status: 'error' } },
        error: 'Analysis failed, but meeting was saved.',
        status: 201,
      });
    }
  } catch (err) {
    console.error('POST /meetings error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * GET /api/meetings
 * List all meetings for the authenticated user.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    res.status(200).json({
      data: { meetings: data ?? [] },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('GET /meetings error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * GET /api/meetings/:id
 * Get a single meeting details.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ data: null, error: 'Meeting not found', status: 404 });
      return;
    }

    res.status(200).json({ data: { meeting: data }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /meetings/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * POST /api/meetings/:id/create-tasks
 */
router.post('/:id/create-tasks', validate(createTasksSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { action_item_indices } = req.body as z.infer<typeof createTasksSchema>;

    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !meeting) {
      res.status(404).json({ data: null, error: 'Meeting not found', status: 404 });
      return;
    }

    const actionItems = (meeting.action_items as any[]) || [];
    const createdTasks: any[] = [];

    for (const idx of action_item_indices) {
      if (idx < 0 || idx >= actionItems.length) continue;

      const item = actionItems[idx];
      const taskPayload = {
        user_id: userId,
        title: item.task || 'Untitled task',
        description: `From meeting: ${meeting.title}`,
        status: 'todo' as const,
        priority: (['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium') as 'high' | 'medium' | 'low',
        tags: ['meeting'],
        due_date: item.due || null,
        context: 'work' as const,
        recurrence: 'none' as const,
      };

      const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert(taskPayload)
        .select()
        .single();

      if (task && !taskError) {
        createdTasks.push(task);
      }
    }

    const existingCreated = (meeting.tasks_created as string[]) || [];
    const newTaskIds = createdTasks.map((t) => t.id);
    const allCreated = [...existingCreated, ...newTaskIds];

    await supabaseAdmin
      .from('meetings')
      .update({ tasks_created: allCreated })
      .eq('id', id);

    res.status(200).json({
      data: { created_tasks: createdTasks },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('POST /meetings/:id/create-tasks error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * DELETE /api/meetings/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error, count } = await supabaseAdmin
      .from('meetings')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    if (count === 0) {
      res.status(404).json({ data: null, error: 'Meeting not found', status: 404 });
      return;
    }

    res.status(200).json({
      data: { message: 'Meeting deleted successfully' },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('DELETE /meetings/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

export default router;
