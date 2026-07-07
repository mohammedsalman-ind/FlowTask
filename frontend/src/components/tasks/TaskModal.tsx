import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { Task, Priority } from '../../types';
import { useTaskStore } from '../../store/taskStore';

// ---- Form schema — simplified (no status / context / recurrence) ----
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).optional(),
  priority: z.enum(['high', 'medium', 'low']),
  due_date: z.string().optional(),
  tags_raw: z.string().optional(), // comma-separated input
});

type TaskFormData = z.infer<typeof taskFormSchema>;

// ---- Config maps ----
const PRIORITY_OPTS: { value: Priority; label: string }[] = [
  { value: 'high',   label: '🔴 High' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'low',    label: '🟢 Low' },
];

// ---- Props ----
interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, the modal is in "edit" mode */
  task?: Task | null;
  /** If provided, pre-fills the form for a new task creation */
  draftTask?: Partial<Task> | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, draftTask }) => {
  const { createTask, updateTask, isMutating } = useTaskStore();
  const isEditing = !!task;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      tags_raw: '',
    },
  });

  // Populate form when editing an existing task or prefilling a draft
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        due_date: task.due_date
          ? new Date(task.due_date).toISOString().slice(0, 16)
          : '',
        tags_raw: task.tags?.join(', ') ?? '',
      });
    } else if (draftTask) {
      reset({
        title: draftTask.title ?? '',
        description: draftTask.description ?? '',
        priority: draftTask.priority ?? 'medium',
        due_date: draftTask.due_date
          ? new Date(draftTask.due_date).toISOString().slice(0, 16)
          : '',
        tags_raw: draftTask.tags?.join(', ') ?? '',
      });
    } else {
      reset({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        tags_raw: '',
      });
    }
  }, [task, draftTask, reset, isOpen]);

  const onSubmit = async (values: TaskFormData) => {
    const tags = values.tags_raw
      ? values.tags_raw.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      title: values.title,
      description: values.description ?? '',
      priority: values.priority,
      // Hardcoded sensible defaults — removed from UI
      status: (task?.status ?? 'todo') as 'todo' | 'in_progress' | 'done',
      context: 'work' as const,
      recurrence: 'none' as const,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
      tags,
    };

    if (isEditing && task) {
      const result = await updateTask(task.id, payload);
      if (result) {
        toast.success('Task updated!');
        onClose();
      } else {
        toast.error('Failed to update task');
      }
    } else {
      const result = await createTask(payload);
      if (result) {
        toast.success('Task created!');
        onClose();
      } else {
        toast.error('Failed to create task');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-lg bg-surface border border-stone-300/50 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-300/50">
          <h2
            id="task-modal-title"
            className="text-lg font-semibold text-text"
          >
            {isEditing ? '✏️ Edit Task' : '✨ New Task'}
          </h2>
          <button
            id="task-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          id="task-modal-form"
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-5 max-h-[75vh] overflow-y-auto"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted" htmlFor="task-title">
              Title *
            </label>
            <input
              id="task-title"
              {...register('title')}
              placeholder="What needs to be done?"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-stone-300/60 text-text placeholder-stone-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
            {errors.title && (
              <p className="text-xs text-red-400">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted" htmlFor="task-desc">
              Description
            </label>
            <textarea
              id="task-desc"
              {...register('description')}
              rows={3}
              placeholder="Add details..."
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-stone-300/60 text-text placeholder-stone-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted" htmlFor="task-priority">
              Priority
            </label>
            <select
              id="task-priority"
              {...register('priority')}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-stone-300/60 text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all appearance-none"
            >
              {PRIORITY_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted" htmlFor="task-due-date">
              Due Date
            </label>
            <input
              id="task-due-date"
              type="datetime-local"
              {...register('due_date')}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-stone-300/60 text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted" htmlFor="task-tags">
              Tags <span className="text-xs text-stone-500">(comma separated)</span>
            </label>
            <input
              id="task-tags"
              {...register('tags_raw')}
              placeholder="design, backend, urgent"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-stone-300/60 text-text placeholder-stone-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-300/50">
          <button
            id="task-modal-cancel"
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-all"
          >
            Cancel
          </button>
          <button
            id="task-modal-submit"
            type="submit"
            form="task-modal-form"
            disabled={isMutating}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isMutating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              'Update Task'
            ) : (
              'Create Task'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
