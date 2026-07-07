import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTaskStore } from '../../store/taskStore';
import { useNavigate, useLocation } from 'react-router-dom';

export const TopBar: React.FC = () => {
  const { logout } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isOpen,
    fetchNotifications,
    markAllAsRead,
    markAsRead,
    toggleOpen,
  } = useNotificationStore();
  const { fetchTasks } = useTaskStore();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        toggleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, toggleOpen]);

  const handleNotificationClick = async (n: any) => {
    await markAsRead(n.id);
    toggleOpen(false);

    if (n.type === 'meeting_processed') {
      navigate('/meetings');
    } else if (n.type === 'task_due' || n.type === 'task_assigned') {
      navigate('/board');
    }
  };

  // Functional search: navigate to board and filter tasks
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (val.trim()) {
        // Navigate to board if not already there
        if (!location.pathname.includes('/board')) {
          navigate('/board');
        }
        fetchTasks({ search: val.trim(), limit: 200 });
      } else {
        fetchTasks({ limit: 200 });
      }
    }, 350);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    fetchTasks({ limit: 200 });
  };

  return (
    <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-stone-300/50 h-16 px-4 flex items-center justify-between md:justify-end">
      {/* Mobile Logo */}
      <div className="md:hidden flex items-center gap-2">
        <span className="text-accent text-xl">⚡</span>
        <span className="font-bold text-lg">FlowTask</span>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4 relative">

        {/* Functional Search Bar */}
        <div className="relative hidden sm:block">
          <input
            id="topbar-search"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search tasks..."
            className="input-field py-1.5 pl-10 pr-8 w-64 text-sm"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Bell Icon Notification Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="topbar-notification-btn"
            onClick={() => toggleOpen()}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors text-text-muted hover:text-text-primary relative"
            aria-label="Notifications"
          >
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-danger rounded-full transform translate-x-1 -translate-y-1 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {isOpen && (
            <div
              id="topbar-notification-dropdown"
              className="absolute right-0 mt-2 w-80 bg-surface rounded-xl border border-stone-300/50 shadow-xl overflow-hidden z-20 animate-fade-in"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-300/30 bg-surface-2">
                <span className="font-semibold text-sm text-text-primary">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      id="topbar-mark-all-read-btn"
                      onClick={() => markAllAsRead()}
                      className="text-xs text-accent hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => toggleOpen(false)}
                    className="text-xs text-text-muted hover:text-text ml-1"
                    aria-label="Close notifications"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-stone-300/20">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-xs text-text-muted">
                    <span className="text-2xl block mb-2">🔕</span>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      id={`notification-item-${n.id}`}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-4 py-3 cursor-pointer hover:bg-stone-400/10 transition-colors text-left flex gap-3 ${
                        !n.is_read ? 'bg-accent/5' : ''
                      }`}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">
                        {n.type === 'meeting_processed' ? '📄' : '📅'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs break-words leading-relaxed ${!n.is_read ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                          {n.message}
                        </p>
                        <span className="text-[10px] text-text-muted mt-1 block">
                          {new Date(n.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          id="topbar-logout-btn"
          onClick={handleLogout}
          className="btn-secondary py-1.5 px-3 text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
};
