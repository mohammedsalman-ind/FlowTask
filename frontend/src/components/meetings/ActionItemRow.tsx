import React, { useState } from 'react';
import type { ActionItem } from '../../types';

interface ActionItemRowProps {
  item: ActionItem;
  index: number;
  isCreated: boolean;
  onAddToTasks: (index: number) => Promise<void>;
}

export const ActionItemRow: React.FC<ActionItemRowProps> = ({
  item,
  index,
  isCreated,
  onAddToTasks,
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const priorityColor: Record<string, string> = {
    high: 'bg-red-500/15 text-red-500',
    medium: 'bg-yellow-500/15 text-yellow-600',
    low: 'bg-emerald-500/15 text-emerald-600',
  };
  const color = priorityColor[item.priority] || 'bg-stone-500/15 text-stone-500';

  const handleAdd = async () => {
    setIsAdding(true);
    await onAddToTasks(index);
    setIsAdding(false);
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-stone-300/30 hover:border-stone-300/60 transition-colors">
      {/* Checkbox indicator */}
      <div className={`flex-shrink-0 mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        isCreated ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-400'
      }`}>
        {isCreated && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{item.task}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-text-muted">👤 {item.assignee}</span>
          {item.due && <span className="text-xs text-text-muted">📅 {item.due}</span>}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {item.priority}
          </span>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={isCreated || isAdding}
        className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
          isCreated
            ? 'bg-emerald-500/10 text-emerald-500 cursor-default'
            : 'btn-primary py-1.5 px-3 text-xs'
        }`}
      >
        {isAdding ? '...' : isCreated ? 'Added ✓' : 'Add to Tasks'}
      </button>
    </div>
  );
};
