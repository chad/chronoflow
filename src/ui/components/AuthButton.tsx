import { useState } from 'react';
import { useAuthStore } from '../../atproto/authStore';

export function AuthButton() {
  const { did, handle, profile, isLoading, login, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  if (isLoading) return null;

  // Signed in — show avatar + handle
  if (did && profile) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700"
        >
          {profile.avatar && (
            <img src={profile.avatar} alt="" className="w-6 h-6 rounded-full" />
          )}
          <span className="text-sm text-gray-300 max-w-[120px] truncate">
            {handle || did}
          </span>
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-[150px]">
            <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
              {handle}
            </div>
            <button
              onClick={() => { logout(); setShowDropdown(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  // Signed out — show sign in button
  if (showLogin) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="handle.bsky.social"
          value={handleInput}
          onChange={(e) => setHandleInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && handleInput.trim()) login(handleInput.trim());
            if (e.key === 'Escape') setShowLogin(false);
          }}
          className="px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white w-48 outline-none focus:border-cyan-400"
          autoFocus
        />
        <button
          onClick={() => handleInput.trim() && login(handleInput.trim())}
          className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded"
        >
          Go
        </button>
        <button
          onClick={() => setShowLogin(false)}
          className="px-1 py-1 text-sm text-gray-400 hover:text-white"
        >
          x
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowLogin(true)}
      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded"
    >
      Sign in
    </button>
  );
}
