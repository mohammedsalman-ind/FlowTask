import React from 'react';
import type { Meeting } from '../../types';

interface MeetingCardProps {
  meeting: Meeting;
  onClick: (meeting: Meeting) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onClick }) => {
  const statusConfig: Record<string, { label: string; color: string }> = {
    processing: { label: 'Processing', color: 'bg-yellow-500/15 text-yellow-600' },
    ready: { label: 'Ready', color: 'bg-emerald-500/15 text-emerald-600' },
    error: { label: 'Error', color: 'bg-red-500/15 text-red-500' },
  };
  const status = statusConfig[meeting.status] || { label: 'Unknown', color: 'bg-stone-500/15 text-stone-500' };

  const inputBadge = meeting.input_type === 'recording'
    ? { label: '🎙️ Recording', color: 'bg-blue-500/15 text-blue-600' }
    : { label: '📄 Transcript', color: 'bg-purple-500/15 text-purple-600' };

  const date = new Date(meeting.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const summaryPreview = meeting.summary
    ? meeting.summary.slice(0, 120) + (meeting.summary.length > 120 ? '...' : '')
    : 'Analysis pending...';

  const tasksCreatedCount = meeting.tasks_created?.length || 0;

  return (
    <button
      onClick={() => onClick(meeting)}
      className="w-full text-left glass-card p-5 space-y-3 hover:border-accent/30 hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary truncate">{meeting.title}</h3>
          <p className="text-xs text-text-muted mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inputBadge.color}`}>
            {inputBadge.label}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-text-muted leading-relaxed">{summaryPreview}</p>

      {tasksCreatedCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600">
          ✅ {tasksCreatedCount} task{tasksCreatedCount !== 1 ? 's' : ''} created
        </span>
      )}
    </button>
  );
};
