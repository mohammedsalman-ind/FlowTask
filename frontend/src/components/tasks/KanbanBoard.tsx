import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { Task, TaskStatus } from '../../types';
import { useTaskStore, groupByStatus } from '../../store/taskStore';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';

// ---- Column config ----

interface ColumnConfig {
  status: TaskStatus;
  title: string;
  emoji: string;
  accent: string;
  emptyMsg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'todo',
    title: 'To Do',
    emoji: '📋',
    accent: 'ring-stone-400/60',
    emptyMsg: 'Drop tasks here to queue them',
  },
  {
    status: 'in_progress',
    title: 'In Progress',
    emoji: '🔄',
    accent: 'ring-blue-500/40',
    emptyMsg: 'Drag tasks here when working on them',
  },
  {
    status: 'done',
    title: 'Done',
    emoji: '✅',
    accent: 'ring-emerald-500/40',
    emptyMsg: 'Completed tasks will appear here',
  },
];

// ---- KanbanColumn ----

interface KanbanColumnProps {
  config: ColumnConfig;
  tasks: Task[];
  draggingId: string | null;
  dropTargetStatus: TaskStatus | null;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, status: TaskStatus) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  config,
  tasks,
  draggingId,
  dropTargetStatus,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEdit,
}) => {
  const isDropTarget = dropTargetStatus === config.status;

  return (
    <div
      className={`
        flex flex-col rounded-2xl border transition-all duration-200 min-h-[400px]
        ${isDropTarget
          ? `border-transparent ring-2 ${config.accent} bg-surface-2/80`
          : 'border-stone-300/40 bg-surface/60'}
      `}
      onDragOver={(e) => onDragOver(e, config.status)}
      onDrop={(e) => onDrop(e, config.status)}
      onDragLeave={() => {}}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-300/40">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.emoji}</span>
          <h3 className="font-semibold text-text text-sm">{config.title}</h3>
        </div>
        <span
          className={`
            px-2.5 py-0.5 rounded-full text-xs font-bold
            ${config.status === 'done'
              ? 'bg-emerald-500/15 text-emerald-400'
              : config.status === 'in_progress'
              ? 'bg-blue-500/15 text-blue-400'
              : 'bg-stone-500/15 text-stone-500'}
          `}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {tasks.length === 0 ? (
          <div
            className={`
              flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed
              text-text-muted text-xs text-center px-4 transition-all
              ${isDropTarget
                ? 'border-accent/60 bg-accent/5 text-accent'
                : 'border-stone-300/40'}
            `}
          >
            {isDropTarget ? '📥 Drop here' : config.emptyMsg}
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={() => onDragStart(task)}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing"
            >
              <TaskCard
                task={task}
                onEdit={onEdit}
                isDragging={draggingId === task.id}
              />
            </div>
          ))
        )}

        {/* Drop zone indicator when dragging over a non-empty column */}
        {isDropTarget && tasks.length > 0 && (
          <div className="h-1 w-full rounded-full bg-accent/40 animate-pulse" />
        )}
      </div>
    </div>
  );
};

// ---- KanbanBoard ----

export const KanbanBoard: React.FC = () => {
  const { tasks, isLoading, fetchTasks, patchStatus } = useTaskStore();

  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // TODO: Re-enable when debounced Kanban search is connected.
  // const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filtered tasks (client-side instant search)
  const filteredTasks = searchQuery.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tasks;

  const columns = groupByStatus(filteredTasks);

  // ---- Drag handlers ----

  const handleDragStart = (task: Task) => {
    setDraggingTask(task);
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDropTargetStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    setDropTargetStatus(status);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDropTargetStatus(null);

    if (!draggingTask) return;
    if (draggingTask.status === targetStatus) {
      setDraggingTask(null);
      return;
    }

    const result = await patchStatus(draggingTask.id, targetStatus);
    setDraggingTask(null);

    if (result) {
      toast.success(`Moved to "${COLUMNS.find((c) => c.status === targetStatus)?.title}"`);
    } else {
      toast.error('Failed to move task');
    }
  };

  // ---- Modal handlers ----

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Kanban Board</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Drag &amp; drop tasks between columns to update their status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <input
              id="kanban-search"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search tasks..."
              className="input-field py-2 pl-9 pr-4 w-52 text-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            id="kanban-new-task-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap"
          >
            <span className="text-lg leading-none">+</span>
            New Task
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6 text-sm text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-stone-500 inline-block" />
          {columns.todo.length} todo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          {columns.in_progress.length} in progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {columns.done.length} done
        </span>
        {searchQuery && (
          <span className="text-xs text-accent font-medium">
            🔍 Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        )}
        <span className="ml-auto text-xs">
          {tasks.length > 0
            ? `${Math.round((columns.done.length / tasks.length) * 100)}% complete`
            : '—'}
        </span>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-surface border border-stone-300/30 skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              config={col}
              tasks={columns[col.status]}
              draggingId={draggingTask?.id ?? null}
              dropTargetStatus={dropTargetStatus}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        task={editingTask}
      />
    </div>
  );
};
