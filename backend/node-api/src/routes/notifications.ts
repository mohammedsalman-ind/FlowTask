import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Retrieve authenticated user's notifications, ordered by newest first.
 * Also dynamically checks for tasks due within 24 hours and inserts task_due notifications.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Find all active tasks due in the next 24 hours
    const { data: dueTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, title, due_date')
      .eq('user_id', userId)
      .neq('status', 'done')
      .gte('due_date', now.toISOString())
      .lte('due_date', twentyFourHoursLater.toISOString());

    if (dueTasks && dueTasks.length > 0) {
      // 2. Fetch existing task_due notifications for this user
      const { data: existingNotifs } = await supabaseAdmin
        .from('notifications')
        .select('reference_id')
        .eq('user_id', userId)
        .eq('type', 'task_due');

      const notifiedTaskIds = new Set((existingNotifs || []).map((n: any) => n.reference_id));

      const newNotifsPayload = [];
      for (const task of dueTasks) {
        if (!notifiedTaskIds.has(task.id)) {
          newNotifsPayload.push({
            user_id: userId,
            message: `Task "${task.title}" is due within 24 hours!`,
            type: 'task_due',
            reference_id: task.id,
            is_read: false
          });
        }
      }

      // 3. Bulk insert new notifications
      if (newNotifsPayload.length > 0) {
        const { error: insertErr } = await supabaseAdmin
          .from('notifications')
          .insert(newNotifsPayload);
        if (insertErr) {
          console.error('Error inserting due task notifications:', insertErr);
        }
      }
    }

    // 4. Fetch all notifications (including the newly added ones)
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    // Count unread
    const unreadCount = (notifications || []).filter((n: any) => !n.is_read).length;

    res.status(200).json({
      data: { notifications: notifications ?? [], unread_count: unreadCount },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});


/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    res.status(200).json({
      data: { message: 'All notifications marked as read' },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('PATCH /notifications/read-all error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ data: null, error: 'Notification not found', status: 404 });
      return;
    }

    res.status(200).json({
      data: { notification: data },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

export default router;
