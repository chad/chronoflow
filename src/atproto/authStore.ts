import { create } from 'zustand';
import { Agent } from '@atproto/api';
import { oauthClient } from './client';
import { getProfile } from './profileCache';

interface AuthState {
  did: string | null;
  handle: string | null;
  agent: Agent | null;
  profile: { displayName: string; avatar: string; description: string } | null;
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (handle: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  did: null,
  handle: null,
  agent: null,
  profile: null,
  isLoading: true,
  error: null,

  init: async () => {
    try {
      const result = await oauthClient.init();
      if (result?.session) {
        const agent = new Agent(result.session);
        const did = result.session.did;
        set({ agent, did, isLoading: false });
        // Fetch profile in background
        const profile = await getProfile(did);
        set({ handle: profile.handle, profile: {
          displayName: profile.displayName || profile.handle,
          avatar: profile.avatar || '',
          description: profile.description || '',
        }});
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('[auth] init failed:', err);
      set({ isLoading: false, error: String(err) });
    }
  },

  login: async (handle: string) => {
    try {
      set({ isLoading: true, error: null });
      await oauthClient.signIn(handle);
      // This redirects — page will reload and init() handles the callback
    } catch (err) {
      set({ isLoading: false, error: String(err) });
    }
  },

  logout: () => {
    set({ did: null, handle: null, agent: null, profile: null });
  },
}));
