import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskCalendar } from '../components/calendar/TaskCalendar';
import { TaskModal } from '../components/tasks/TaskModal';
import type { Task } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { tasks, isLoading, fetchTasks } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // ---- Computed Data ----
  const now = new Date();
  const todayDateString = now.toDateString();

  const completedTasks = tasks.filter(t => t.status === 'done');
  
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate < now && dueDate.toDateString() !== todayDateString;
  });

  const dueTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate >= now || dueDate.toDateString() === todayDateString;
  });

  const todaysFocus = pendingTasks
    .filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date).toDateString() === todayDateString;
    })
    .sort((a, b) => {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.priority] - weight[a.priority];
    });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋
        </h1>
        <p className="text-text-muted mt-2">
          Here is an overview of your tasks for today.
        </p>
      </header>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col justify-center border-l-4 border-l-accent">
          <p className="text-sm font-medium text-text-muted mb-1">Due Tasks</p>
          <p className="text-3xl font-bold text-text-primary">{dueTasks.length}</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center border-l-4 border-l-success">
          <p className="text-sm font-medium text-text-muted mb-1">Completed Tasks</p>
          <p className="text-3xl font-bold text-text-primary">{completedTasks.length}</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center border-l-4 border-l-danger">
          <p className="text-sm font-medium text-text-muted mb-1">Overdue Tasks</p>
          <p className="text-3xl font-bold text-danger">{overdueTasks.length}</p>
        </div>
      </div>

      {/* Middle Row: Today's Focus (70%) & Calendar (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Today's Tasks */}
        <div className="lg:col-span-6 glass-card-elevated p-6 min-h-[400px]">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span className="text-accent">🎯</span> Today's Tasks
          </h2>
          {isLoading && tasks.length === 0 ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                 <div key={i} className="h-24 w-full bg-surface-2 skeleton rounded-xl"></div>
              ))}
            </div>
          ) : todaysFocus.length > 0 ? (
            <div className="space-y-3">
              {todaysFocus.map(task => (
                <TaskCard key={task.id} task={task} onEdit={handleOpenEdit} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted text-sm border-2 border-dashed border-stone-300/50 rounded-xl">
              <span className="text-3xl mb-2">🎉</span>
              No tasks due today! Relax or get ahead.
            </div>
          )}
        </div>

        {/* Right: Mini Calendar */}
        <div className="lg:col-span-6 glass-card p-4 min-h-[400px]">
          <TaskCalendar mini={true} />
        </div>
      </div>

      {/* Bottom Row: Past Due Tasks */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-danger">
          <span className="text-danger">⚠️</span> Past Due Tasks
        </h2>
        {isLoading && tasks.length === 0 ? (
            <div className="h-24 w-full bg-surface-2 skeleton rounded-xl"></div>
        ) : overdueTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overdueTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={handleOpenEdit} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-text-muted flex items-center gap-2">
             <span className="text-emerald-500">✅</span> You have no overdue tasks. Great job!
          </div>
        )}
      </div>

      {/* Modal for editing tasks from Dashboard */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        task={editingTask}
      />
    </div>
  );
};
