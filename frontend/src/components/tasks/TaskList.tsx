import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';

import type { Task, TaskStatus } from '../../types';
// import type { ParseTaskResponse } from '../../types';

const STATUS_TABS: { value: TaskStatus | 'all'; label: string; emoji: string }[] = [
  { value: 'all',         label: 'All',         emoji: '📋' },
  { value: 'todo',        label: 'To Do',       emoji: '⬜' },
  { value: 'in_progress', label: 'In Progress', emoji: '🔄' },
  { value: 'done',        label: 'Done',        emoji: '✅' },
];

const PRIORITY_OPTS = [
  { value: '', label: 'All Priorities' },
  { value: 'high', label: '🔴 High' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'low', label: '🟢 Low' },
];

const CONTEXT_OPTS = [
  { value: '', label: 'All Contexts' },
  { value: 'work',     label: '💼 Work' },
  { value: 'personal', label: '🏠 Personal' },
  { value: 'health',   label: '🏃 Health' },
  { value: 'study',    label: '📚 Study' },
];

export const TaskList: React.FC = () => {
  const { tasks, isLoading, fetchTasks, filters, setFilters } = useTaskStore();

  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draftTask, setDraftTask] = useState<Partial<Task> | null>(null);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Re-fetch when filters change (debounce search)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchTasks({ search, status: activeTab === 'all' ? undefined : activeTab });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTab, filters.priority, filters.context]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setDraftTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setDraftTask(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setDraftTask(null);
  };

  // TODO: Re-enable when voice task parsing is connected.
  // const handleVoiceParsed = (data: ParseTaskResponse) => {
  //   setEditingTask(null);
  //   // Map ParseTaskResponse fields to a partial Task object
  //   setDraftTask({
  //     title: data.title,
  //     due_date: data.due_date,
  //     priority: data.priority,
  //     tags: data.tags,
  //     context: data.context,
  //   });
  //   setIsModalOpen(true);
  // };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Tasks</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="task-list-new-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 active:scale-95"
          >
            <span className="text-lg leading-none">+</span>
            New Task
          </button>
        </div>
      </div>

      {/* Search + Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-base pointer-events-none">
            🔍
          </span>
          <input
            id="task-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-stone-300/60 text-text placeholder-stone-500 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
          />
        </div>

        {/* Priority filter */}
        <select
          id="task-filter-priority"
          value={filters.priority ?? ''}
          onChange={(e) => setFilters({ priority: e.target.value || undefined })}
          className="px-4 py-2.5 rounded-xl bg-surface border border-stone-300/60 text-text text-sm focus:outline-none focus:border-accent transition-all appearance-none cursor-pointer"
        >
          {PRIORITY_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Context filter */}
        <select
          id="task-filter-context"
          value={filters.context ?? ''}
          onChange={(e) => setFilters({ context: e.target.value || undefined })}
          className="px-4 py-2.5 rounded-xl bg-surface border border-stone-300/60 text-text text-sm focus:outline-none focus:border-accent transition-all appearance-none cursor-pointer"
        >
          {CONTEXT_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-stone-300/40 w-fit">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'all'
              ? tasks.length
              : tasks.filter((t) => t.status === tab.value).length;
          return (
            <button
              key={tab.value}
              id={`task-tab-${tab.value}`}
              onClick={() => setActiveTab(tab.value)}
              className={`
                flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.value
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'text-text-muted hover:text-text hover:bg-surface-2'}
              `}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span
                className={`
                  px-1.5 py-0.5 rounded-full text-xs font-bold
                  ${activeTab === tab.value ? 'bg-white/20' : 'bg-surface-2'}
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-surface border border-stone-300/30 skeleton" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <span className="text-5xl">✨</span>
          <h3 className="text-lg font-semibold text-text">No tasks yet</h3>
          <p className="text-sm text-text-muted max-w-xs">
            Click <strong>New Task</strong> to add your first task and start staying productive!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={handleOpenEdit} />
          ))}
        </div>
      )}

      {/* Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        draftTask={draftTask}
      />
    </div>
  );
};
