import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// ---- Zod Schemas ----

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional().default(''),
  status: z.enum(['todo', 'in_progress', 'done']).optional().default('todo'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  tags: z.array(z.string()).optional().default([]),
  due_date: z.string().datetime({ offset: true }).nullable().optional(),
  reminder_time: z.string().datetime({ offset: true }).nullable().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional().default('none'),
  goal_id: z.string().uuid().nullable().optional(),
  context: z.enum(['work', 'personal', 'health', 'study']).optional().default('personal'),
});

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  tags: z.array(z.string()).optional(),
  due_date: z.string().datetime({ offset: true }).nullable().optional(),
  reminder_time: z.string().datetime({ offset: true }).nullable().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  goal_id: z.string().uuid().nullable().optional(),
  context: z.enum(['work', 'personal', 'health', 'study']).optional(),
});

// Partial update schema (for PATCH /tasks/:id/status)
const patchStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']),
});

// ---- Routes ----

/**
 * GET /api/tasks
 * List all tasks for the authenticated user, with optional filters.
 *
 * Query params:
 *   status     — 'todo' | 'in_progress' | 'done'
 *   priority   — 'high' | 'medium' | 'low'
 *   context    — 'work' | 'personal' | 'health' | 'study'
 *   goal_id    — UUID
 *   search     — full-text search on title / description
 *   sort_by    — 'due_date' | 'priority' | 'created_at' (default: 'created_at')
 *   sort_order — 'asc' | 'desc' (default: 'desc')
 *   limit      — max rows (default: 100)
 *   offset     — pagination offset (default: 0)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      status,
      priority,
      context,
      goal_id,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
      limit = '100',
      offset = '0',
    } = req.query as Record<string, string>;

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    // Apply optional filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (context) query = query.eq('context', context);
    if (goal_id) query = query.eq('goal_id', goal_id);

    // Full-text search on title + description
    if (search && search.trim()) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Sorting — map priority sort to a deterministic order
    const validSortColumns = ['due_date', 'created_at', 'updated_at', 'title'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    query = query
      .order(sortColumn, { ascending: sort_order === 'asc', nullsFirst: false })
      .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

    const { data, error, count } = await query;

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    res.status(200).json({
      data: { tasks: data ?? [], total: count ?? data?.length ?? 0 },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('GET /tasks error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * GET /api/tasks/:id
 * Get a single task by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ data: null, error: 'Task not found', status: 404 });
      return;
    }

    res.status(200).json({ data: { task: data }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /tasks/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * POST /api/tasks
 * Create a new task for the authenticated user.
 */
router.post('/', validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const payload = req.body as z.infer<typeof createTaskSchema>;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    res.status(201).json({ data: { task: data }, error: null, status: 201 });
  } catch (err) {
    console.error('POST /tasks error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * PUT /api/tasks/:id
 * Full update of a task (replaces provided fields).
 */
router.put('/:id', validate(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const payload = req.body as z.infer<typeof updateTaskSchema>;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      res.status(404).json({ data: null, error: 'Task not found', status: 404 });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    res.status(200).json({ data: { task: data }, error: null, status: 200 });
  } catch (err) {
    console.error('PUT /tasks/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Quick-update just the status (used by drag-and-drop Kanban).
 */
router.patch('/:id/status', validate(patchStatusSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body as z.infer<typeof patchStatusSchema>;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ data: null, error: 'Task not found', status: 404 });
      return;
    }

    res.status(200).json({ data: { task: data }, error: null, status: 200 });
  } catch (err) {
    console.error('PATCH /tasks/:id/status error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task by ID.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error, count } = await supabaseAdmin
      .from('tasks')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    if (count === 0) {
      res.status(404).json({ data: null, error: 'Task not found', status: 404 });
      return;
    }

    res.status(200).json({
      data: { message: 'Task deleted successfully' },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

export default router;
