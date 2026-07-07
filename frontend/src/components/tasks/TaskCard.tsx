import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { Task } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { ConfirmModal } from '../ui/ConfirmModal';

// ---- Helpers ----

function priorityBadge(priority: Task['priority']) {
  const map = {
    high:   { label: 'High',   className: 'bg-red-500/15 text-red-400 ring-red-500/20' },
    medium: { label: 'Medium', className: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/20' },
    low:    { label: 'Low',    className: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20' },
  };
  return map[priority];
}

function formatDueDate(iso: string | null): { label: string; isOverdue: boolean } | null {
  if (!iso) return null;
  const date = new Date(iso);
  const now = new Date();
  const isOverdue = date < now;
  const diffMs = Math.abs(date.getTime() - now.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let label: string;
  if (diffDays === 0) {
    label = 'Today';
  } else if (!isOverdue && diffDays === 1) {
    label = 'Tomorrow';
  } else if (isOverdue && diffDays === 1) {
    label = 'Yesterday';
  } else {
    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return { label, isOverdue };
}

// ---- Props ----

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  /** When true, disables all interactions (used during drag) */
  isDragging?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, isDragging = false }) => {
  const { patchStatus, deleteTask } = useTaskStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDone, setIsConfirmingDone] = useState(false);

  const badge = priorityBadge(task.priority);
  const due = formatDueDate(task.due_date);
  const isDone = task.status === 'done';

  const handleToggleDone = () => {
    if (isDone) {
      // If it's already done, we just un-check it without confirmation
      patchStatus(task.id, 'todo');
    } else {
      // If they are marking it as done, ask for confirmation
      setIsConfirmingDone(true);
    }
  };

  const confirmDone = async () => {
    setIsConfirmingDone(false);
    await patchStatus(task.id, 'done');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await deleteTask(task.id);
    if (!ok) {
      setIsDeleting(false);
      toast.error('Could not delete task');
    }
  };

  return (
    <div
      className={`
        group relative bg-surface border border-stone-300/50 rounded-xl p-4 space-y-3
        hover:border-stone-400/70 hover:shadow-lg hover:shadow-black/20
        transition-all duration-200 cursor-default
        ${isDragging ? 'opacity-50 ring-2 ring-accent/50 rotate-1' : ''}
        ${isDone ? 'opacity-60' : ''}
      `}
    >
      {/* Top row: checkbox + title + action menu */}
      <div className="flex items-start gap-3">
        {/* Done toggle */}
        <button
          id={`task-toggle-${task.id}`}
          onClick={handleToggleDone}
          aria-label={isDone ? 'Mark as to-do' : 'Mark as done'}
          className={`
            flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 transition-all duration-200
            flex items-center justify-center
            ${isDone
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-stone-400 hover:border-accent bg-transparent'}
          `}
        >
          {isDone && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>

        {/* Title */}
        <p
          className={`flex-1 text-sm font-medium leading-snug text-text
            ${isDone ? 'line-through text-text-muted' : ''}
          `}
        >
          {task.title}
        </p>

        {/* Action buttons (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            id={`task-edit-${task.id}`}
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors text-xs"
          >
            ✏️
          </button>
          <button
            id={`task-delete-${task.id}`}
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete task"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs disabled:opacity-50"
          >
            {isDeleting ? '…' : '🗑️'}
          </button>
        </div>
      </div>

      {/* Description snippet */}
      {task.description && (
        <p className="text-xs text-text-muted line-clamp-2 pl-8 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-8">
          {task.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs bg-surface-2 text-text-muted border border-stone-300/50"
            >
              #{tag}
            </span>
          ))}
          {task.tags.length > 4 && (
            <span className="text-xs text-text-muted">+{task.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Bottom row: priority + due date */}
      <div className="flex items-center justify-between pl-8">
        <div className="flex items-center gap-2">
          {/* Priority badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Due date */}
        {due && (
          <span
            className={`text-xs font-medium flex items-center gap-1 ${
              due.isOverdue ? 'text-red-400' : 'text-text-muted'
            }`}
          >
            {due.isOverdue ? '⚠️' : '📅'} {due.label}
          </span>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmingDone}
        title="Mark Task as Done?"
        message={`Are you sure you did "${task.title}"?`}
        confirmText="Yes, I did it!"
        onConfirm={confirmDone}
        onCancel={() => setIsConfirmingDone(false)}
      />
    </div>
  );
};
