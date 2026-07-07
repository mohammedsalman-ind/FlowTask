import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Board', path: '/board', icon: '📋' },
  { label: 'Meetings', path: '/meetings', icon: '🎙️' },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-stone-300/50 bg-surface fixed left-0 top-0 z-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-accent">⚡</span> FlowTask
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'nav-link-active' : 'nav-link'
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="p-4 mt-auto border-t border-stone-300/50 relative" ref={menuRef}>
          {/* Popover Menu */}
          {menuOpen && (
            <div className="absolute bottom-20 left-4 right-4 bg-surface border border-stone-300/50 rounded-xl shadow-2xl p-3 space-y-2 z-30 animate-fade-in">
              <div className="px-2 py-1.5 border-b border-stone-300/20">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {user.name || 'User Profile'}
                </p>
                <p className="text-[10px] text-text-muted truncate mt-0.5">{user.email}</p>
              </div>
              <div className="space-y-1">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-2 transition-colors"
                >
                  👤 Profile Settings
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-2 transition-colors"
                >
                  ⚙️ Preferences
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-danger hover:bg-danger/10 rounded-lg transition-colors text-left font-medium"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}

          {/* User Block Trigger */}
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-3 p-2 rounded-lg bg-surface-2 cursor-pointer hover:bg-stone-400/50 transition-colors border ${
              menuOpen ? 'border-accent/40 bg-stone-400/30' : 'border-transparent'
            }`}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-medium flex-shrink-0">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user.name || 'Set your name'}
              </p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
            <span className="text-xs text-text-muted">{menuOpen ? '▲' : '▼'}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
