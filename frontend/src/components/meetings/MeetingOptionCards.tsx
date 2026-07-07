import React from 'react';

interface MeetingOptionCardsProps {
  onSelect: () => void;
}

export const MeetingOptionCards: React.FC<MeetingOptionCardsProps> = ({ onSelect }) => {
  return (
    <div className="flex justify-center">
      <button
        onClick={onSelect}
        className="
          relative text-left p-8 rounded-xl border w-full max-w-lg
          border-accent bg-accent/5 ring-2 ring-accent/20
          hover:border-accent hover:scale-[1.01] hover:shadow-lg
          transition-all duration-200
        "
      >
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Upload Transcript</h3>
        <p className="text-sm text-text-muted leading-relaxed">
          Upload a <strong className="text-text-primary">.txt</strong> or{' '}
          <strong className="text-text-primary">.pdf</strong> transcript file and let AI extract
          key notes and action items from it.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
          <span>Choose file</span>
          <span>→</span>
        </div>
      </button>
    </div>
  );
};
