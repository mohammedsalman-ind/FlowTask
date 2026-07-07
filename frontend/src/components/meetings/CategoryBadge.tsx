import React from 'react';
import type { NoteCategory } from '../../types';

const CATEGORY_CONFIG: Record<NoteCategory, { emoji: string; label: string; color: string }> = {
  decision:    { emoji: '🟣', label: 'Decision',    color: 'bg-purple-500/15 text-purple-600 ring-purple-500/20' },
  discussion:  { emoji: '🟡', label: 'Discussion',  color: 'bg-yellow-500/15 text-yellow-600 ring-yellow-500/20' },
  blocker:     { emoji: '🔴', label: 'Blocker',     color: 'bg-red-500/15 text-red-500 ring-red-500/20' },
  information: { emoji: '🔵', label: 'Information', color: 'bg-blue-500/15 text-blue-600 ring-blue-500/20' },
};

interface CategoryBadgeProps {
  category: NoteCategory;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.information;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${config.color}`}
    >
      {config.emoji} {config.label}
    </span>
  );
};
