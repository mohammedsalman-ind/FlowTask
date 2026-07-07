import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMeetingStore } from '../store/meetingStore';
import { MeetingOptionCards } from '../components/meetings/MeetingOptionCards';
import { TranscriptUploader } from '../components/meetings/TranscriptUploader';
import { MeetingCard } from '../components/meetings/MeetingCard';
import { MeetingDetail } from '../components/meetings/MeetingDetail';
import { ProcessingShimmer } from '../components/meetings/ProcessingShimmer';
import { TaskPreviewModal } from '../components/meetings/TaskPreviewModal';
import type { Meeting, ExtractedTask } from '../types';

export const MeetingsPage: React.FC = () => {
  const {
    meetings,
    isLoading,
    isAnalyzing,
    isSaving,
    fetchMeetings,
    analyzeTranscript,
    saveTranscriptTasks,
  } = useMeetingStore();

  const [showInputPanel, setShowInputPanel] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  
  // Preview modal states
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile && !meetingTitle.trim()) {
      // Get filename without extension
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      // Clean up symbols (like leading #, underscores, hyphens to spaces)
      const cleanTitle = fileNameWithoutExt
        .replace(/^#\s*/, "")
        .replace(/[-_]/g, " ")
        .trim();
      setMeetingTitle(cleanTitle);
    }
  };

  const handleAnalyze = async () => {
    if (!meetingTitle.trim() || !file) {
      toast.error('Please enter a meeting title and upload a transcript file.');
      return;
    }

    const tasks = await analyzeTranscript(meetingTitle, file);

    if (tasks) {
      setExtractedTasks(tasks);
      setShowPreview(true);
    } else {
      toast.error('Could not analyze the meeting. Please try again.');
    }
  };

  const handleSaveConfirmedTasks = async (confirmedTasks: ExtractedTask[]) => {
    if (!file) return;
    const meeting = await saveTranscriptTasks(meetingTitle, file.name, confirmedTasks);
    if (meeting) {
      toast.success('Meeting analyzed and tasks saved to Board!');
      setShowPreview(false);
      setExtractedTasks([]);
      setShowInputPanel(false);
      setMeetingTitle('');
      setFile(null);
      fetchMeetings(); // Refresh list to see the new meeting
    } else {
      toast.error('Failed to save tasks. Please try again.');
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setExtractedTasks([]);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Meeting Assistant
          </h1>
          <p className="text-text-muted mt-1">
            Turn any meeting transcript into notes and tasks
          </p>
        </div>
        <button
          onClick={() => setShowInputPanel(!showInputPanel)}
          className="btn-primary"
        >
          {showInputPanel ? '✕ Cancel' : '+ New Meeting'}
        </button>
      </header>

      {/* Input Panel */}
      {showInputPanel && (
        <div className="glass-card-elevated p-6 space-y-6 animate-slide-up">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Meeting Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. Sprint Planning — June 29"
              className="input-field"
            />
          </div>

          {/* Option Card: Shows single option 'Upload Transcript' */}
          <MeetingOptionCards onSelect={() => {}} />

          {/* Upload Section */}
          <TranscriptUploader file={file} onFileChange={handleFileChange} />

          {/* Inline Validation & Analyze Button */}
          <div className="space-y-2 pt-2">
            {(!meetingTitle.trim() || !file) && (
              <p className="text-xs text-warning font-medium">
                ⚠️ Please provide both a Meeting Title and a valid file (.txt or .pdf).
              </p>
            )}
            <button
              onClick={handleAnalyze}
              disabled={!meetingTitle.trim() || !file || isAnalyzing}
              className="btn-primary w-full text-base py-3"
            >
              {isAnalyzing ? '⏳ Analyzing meeting...' : '✨ Analyze Meeting'}
            </button>
          </div>
        </div>
      )}

      {/* Processing Shimmer */}
      {isAnalyzing && (
        <ProcessingShimmer
          message="AI is processing your transcript and extracting tasks..."
        />
      )}

      {/* Past Meetings List */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          📁 Past Meetings
          {meetings.length > 0 && (
            <span className="text-sm font-normal text-text-muted">
              ({meetings.length})
            </span>
          )}
        </h2>

        {isLoading && meetings.length === 0 ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 w-full bg-surface-2 skeleton rounded-xl" />
            ))}
          </div>
        ) : meetings.length > 0 ? (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={(m) => setDetailMeeting(m)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted text-sm border-2 border-dashed border-stone-300/50 rounded-xl">
            <span className="text-3xl mb-2">📄</span>
            No meetings yet. Upload a transcript to get started.
          </div>
        )}
      </section>

      {/* Meeting Detail Modal */}
      {detailMeeting && (
        <MeetingDetail
          meeting={detailMeeting}
          onClose={() => setDetailMeeting(null)}
        />
      )}

      {/* Task Preview Modal */}
      {showPreview && (
        <TaskPreviewModal
          tasks={extractedTasks}
          meetingTitle={meetingTitle}
          onSave={handleSaveConfirmedTasks}
          onCancel={handleCancelPreview}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default MeetingsPage;
