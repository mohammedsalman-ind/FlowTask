import React, { useState } from 'react';
import { TaskList } from '../components/tasks/TaskList';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import type { TaskViewMode } from '../types';

const VIEW_TABS: { value: TaskViewMode; label: string; emoji: string }[] = [
  { value: 'list',     label: 'List',   emoji: '📋' },
  { value: 'board',    label: 'Board',  emoji: '🗂️' },
];

export const TasksPage: React.FC = () => {
  const [view, setView] = useState<TaskViewMode>('list');

  return (
    <div className="space-y-6">
      {/* View switcher */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-stone-300/40 w-fit">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            id={`tasks-view-${tab.value}`}
            onClick={() => setView(tab.value)}
            className={`
              flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${view === tab.value
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'text-text-muted hover:text-text hover:bg-surface-2'}
            `}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* View content */}
      {view === 'list'  && <TaskList />}
      {view === 'board' && <KanbanBoard />}
    </div>
  );
};
