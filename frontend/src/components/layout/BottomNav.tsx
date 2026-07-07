import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dash', path: '/', icon: '📊' },
  { label: 'Cal', path: '/calendar', icon: '📅' },
  { label: 'Habits', path: '/habits', icon: '✨' },
  { label: 'Goals', path: '/goals', icon: '🎯' },
  { label: 'Board', path: '/board', icon: '📋' },
];

export const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-stone-300/50 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
