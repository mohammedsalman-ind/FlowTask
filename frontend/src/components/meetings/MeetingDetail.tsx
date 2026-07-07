import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { Meeting } from '../../types';
import { useMeetingStore } from '../../store/meetingStore';
import { CategoryBadge } from './CategoryBadge';
import { ActionItemRow } from './ActionItemRow';

interface MeetingDetailProps {
  meeting: Meeting;
  onClose: () => void;
}

export const MeetingDetail: React.FC<MeetingDetailProps> = ({ meeting, onClose }) => {
  const { createTasksFromMeeting, deleteMeeting } = useMeetingStore();
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const handleAddTask = async (index: number) => {
    const tasks = await createTasksFromMeeting(meeting.id, [index]);
    if (tasks.length > 0) {
      setAddedIndices((prev) => new Set(prev).add(index));
      toast.success('✅ Task added!');
    } else {
      toast.error('Failed to create task');
    }
  };

  const handleAddAll = async () => {
    const unaddedIndices = meeting.action_items
      .map((_, i: number) => i)
      .filter((i: number) => !addedIndices.has(i));

    if (unaddedIndices.length === 0) {
      toast('All action items are already added!');
      return;
    }

    const tasks = await createTasksFromMeeting(meeting.id, unaddedIndices);
    if (tasks.length > 0) {
      const newSet = new Set(addedIndices);
      unaddedIndices.forEach((i: number) => newSet.add(i));
      setAddedIndices(newSet);
      toast.success(`✅ ${tasks.length} tasks added to your board!`, {
        duration: 4000,
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await deleteMeeting(meeting.id);
    if (ok) {
      toast.success('Meeting deleted');
      onClose();
    } else {
      toast.error('Failed to delete meeting');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Detail Panel */}
      <div className="relative bg-surface rounded-2xl shadow-xl border border-stone-300/30 w-full max-w-3xl my-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-300/30">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{meeting.title}</h2>
            <p className="text-sm text-text-muted mt-0.5">
              {new Date(meeting.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-danger py-1.5 px-3 text-sm"
            >
              {isDeleting ? '...' : '🗑️ Delete'}
            </button>
            <button onClick={onClose} className="btn-secondary py-1.5 px-3 text-sm">
              ✕ Close
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Section 1: Summary */}
          {meeting.summary && (
            <section>
              <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                📋 Meeting Summary
              </h3>
              <p className="text-sm text-text-muted leading-relaxed bg-surface-2 p-4 rounded-xl">
                {meeting.summary}
              </p>
            </section>
          )}

          {/* Section 2: Key Notes */}
          {meeting.key_notes && meeting.key_notes.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                💡 Key Points
              </h3>
              <div className="space-y-2">
                {meeting.key_notes.map((note: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-2"
                  >
                    <CategoryBadge category={note.category} />
                    <p className="text-sm text-text-primary flex-1">{note.point}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Action Items */}
          {meeting.action_items && meeting.action_items.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                ✅ Action Items
              </h3>
              <div className="space-y-2">
                {meeting.action_items.map((item: any, i: number) => (
                  <ActionItemRow
                    key={i}
                    item={item}
                    index={i}
                    isCreated={addedIndices.has(i)}
                    onAddToTasks={handleAddTask}
                  />
                ))}
              </div>
              <button
                onClick={handleAddAll}
                className="btn-primary w-full mt-4"
              >
                Add All to Tasks
              </button>
            </section>
          )}

          {/* Section 4: Full Transcript (collapsible) */}
          <section>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              <span>{showTranscript ? '▼' : '▶'}</span>
              {meeting.input_type === 'recording' ? '🎙️ Recorded Transcript' : '📄 Uploaded Transcript'}
            </button>
            {showTranscript && (
              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl bg-surface-2 p-4 text-sm text-text-muted font-mono leading-relaxed">
                {meeting.raw_transcript || 'No transcript available.'}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
