import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Sync initial state when user is fetched
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Display Name cannot be empty');
      return;
    }

    const ok = await updateProfile(name, avatarUrl.trim() || null);
    if (ok) {
      toast.success('Profile updated successfully!');
    } else {
      toast.error('Failed to update profile. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center animate-pulse-soft">⚡ Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          My Profile
        </h1>
        <p className="text-text-muted mt-1">
          Manage your display settings and account details
        </p>
      </header>

      {/* Profile Form Card */}
      <div className="glass-card p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex items-center gap-4 border-b border-stone-300/30 pb-6">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-accent"
                onError={(e) => {
                  // Fallback on broken URL
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || user.email)}`;
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold border-2 border-accent/20">
                {(name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {name || 'Your Profile Avatar'}
              </h3>
              <p className="text-xs text-text-muted">
                Avatar preview resolves dynamically. Enter a direct image URL below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="input-field text-sm"
                required
              />
            </div>

            {/* Email Address (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="input-field text-sm bg-surface-2 opacity-60 cursor-not-allowed text-text-muted"
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                For security reasons, your login email cannot be changed.
              </p>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Avatar Image URL (Optional)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="input-field text-sm"
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                Provide a direct link to an image (PNG, JPG, SVG).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-300/30">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary py-2 px-6 text-sm"
            >
              {isLoading ? '⏳ Saving changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
