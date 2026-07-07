import React from 'react';

export const ProcessingShimmer: React.FC<{ message?: string }> = ({
  message = 'AI is analyzing your meeting...',
}) => {
  return (
    <div className="glass-card p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-lg animate-spin">✨</span>
        </div>
        <div>
          <div className="h-5 w-48 bg-surface-2 rounded" />
          <p className="text-sm text-text-muted mt-1">{message}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-surface-2 rounded" />
        <div className="h-4 w-5/6 bg-surface-2 rounded" />
        <div className="h-4 w-4/6 bg-surface-2 rounded" />
      </div>
    </div>
  );
};
