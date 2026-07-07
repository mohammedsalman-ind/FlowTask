import React, { useState } from 'react';
import type { ExtractedTask } from '../../types';

interface TaskPreviewModalProps {
  tasks: ExtractedTask[];
  meetingTitle: string;
  onSave: (tasks: ExtractedTask[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  High:   { label: 'High',   color: 'bg-red-500/15 text-red-500',     dot: '🔴' },
  Medium: { label: 'Medium', color: 'bg-yellow-500/15 text-yellow-600', dot: '🟡' },
  Low:    { label: 'Low',    color: 'bg-emerald-500/15 text-emerald-600', dot: '🟢' },
};

export const TaskPreviewModal: React.FC<TaskPreviewModalProps> = ({
  tasks,
  meetingTitle,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [editableTasks, setEditableTasks] = useState<ExtractedTask[]>(tasks);

  const updateTask = (index: number, field: keyof ExtractedTask, value: string | string[] | null) => {
    setEditableTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const removeTask = (index: number) => {
    setEditableTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(editableTasks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-surface rounded-2xl shadow-2xl border border-stone-300/30 w-full max-w-2xl my-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-300/30">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              ✨ Extracted Tasks
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              From: <span className="font-medium text-text-primary">{meetingTitle}</span>
              {' · '}{editableTasks.length} task{editableTasks.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button onClick={onCancel} className="btn-secondary py-1.5 px-3 text-sm">
            ✕ Discard
          </button>
        </div>

        {/* Instruction */}
        <div className="px-6 pt-4 pb-1">
          <p className="text-xs text-text-muted bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
            💡 Review and edit before saving. Tasks marked "To be known" had insufficient info in the transcript.
          </p>
        </div>

        {/* Task list */}
        <div className="p-6 space-y-3 max-h-[55vh] overflow-y-auto">
          {editableTasks.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <span className="text-3xl block mb-2">🤷</span>
              No tasks to display. All were removed.
            </div>
          ) : (
            editableTasks.map((task, i) => {
              const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Low;
              return (
                <div
                  key={i}
                  className="glass-card p-4 space-y-2 relative"
                >
                  {/* Remove button */}
                  <button
                    onClick={() => removeTask(i)}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-surface-2 text-text-muted
                               hover:text-danger hover:bg-danger/10 transition-colors text-xs flex items-center justify-center"
                    title="Remove task"
                  >
                    ✕
                  </button>

                  {/* Title (editable) */}
                  <input
                    type="text"
                    value={task.title === 'To be known' ? '' : task.title}
                    placeholder="Task title (To be known)"
                    onChange={(e) => updateTask(i, 'title', e.target.value || 'To be known')}
                    className="input-field text-sm font-medium py-1.5 pr-8"
                  />

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Priority badge */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pCfg.color}`}>
                      {pCfg.dot} {pCfg.label}
                    </span>

                    {/* Due date */}
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span>📅</span>
                      {task.due_date ? (
                        <span className="text-text-primary">
                          {new Date(task.due_date).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="italic text-text-muted">To be known</span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span>🏷️</span>
                      {task.tags && task.tags.length > 0 ? (
                        task.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-surface-2 rounded text-xs text-text-primary">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="italic">To be known</span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && task.description !== 'To be known' && (
                    <p className="text-xs text-text-muted leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-stone-300/30 bg-surface-2 rounded-b-2xl">
          <p className="text-xs text-text-muted">
            {editableTasks.length} task{editableTasks.length !== 1 ? 's' : ''} will be added to your Board
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn-secondary py-2 px-4 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || editableTasks.length === 0}
              className="btn-primary py-2 px-5 text-sm"
            >
              {isSaving ? '⏳ Saving...' : '✅ Save to Board'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
