import React from 'react';

export const CalendarLegend: React.FC = () => {
  return (
    <div className="flex items-center gap-4 text-xs text-text-muted mt-2 mb-4 bg-surface-2 p-3 rounded-lg border border-stone-300/50">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
        <span>High Priority (Critical)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]"></span>
        <span>Medium Priority</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></span>
        <span>Low Priority</span>
      </div>
    </div>
  );
};
