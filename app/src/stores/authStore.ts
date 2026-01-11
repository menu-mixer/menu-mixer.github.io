import { create } from 'zustand';
import type { AuthState, TierLimits } from '@/types';
import {
  loadAuth,
  clearAuth,
  validateInviteCode,
  refreshToken,
  getUsage,
} from '@/lib/ai/client';
import { getStarterPack, loadStarterPack } from '@/lib/starterPack';

interface AuthStore extends AuthState {
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (inviteCode: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  updateLimits: (limits: Partial<TierLimits>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  token: null,
  tier: null,
  limits: null,
  starterPackId: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    const stored = loadAuth();
    if (stored?.token) {
      set({ ...stored, isLoading: false });
      // Try to refresh token in background
      try {
        await get().refresh();
      } catch {
        // Token expired, user will need to re-authenticate
      }
    } else {
      set({ isLoading: false });
    }
  },

  login: async (inviteCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const authState = await validateInviteCode(inviteCode);
      set({ ...authState, isLoading: false });

      // Load starter pack if present
      if (authState.starterPackId) {
        const pack = getStarterPack(authState.starterPackId);
        if (pack) {
          try {
            await loadStarterPack(pack);
            // Trigger a page reload to refresh stores with new data
            window.location.reload();
          } catch (err) {
            console.error('Failed to load starter pack:', err);
          }
        }
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  },

  logout: () => {
    clearAuth();
    set({
      isAuthenticated: false,
      token: null,
      tier: null,
      limits: null,
      starterPackId: null,
      error: null,
    });
  },

  refresh: async () => {
    try {
      const authState = await refreshToken();
      set({ ...authState });
    } catch (err) {
      if (err instanceof Error && err.name === 'AuthExpiredError') {
        set({
          isAuthenticated: false,
          token: null,
          tier: null,
          limits: null,
          starterPackId: null,
        });
      }
      throw err;
    }
  },

  fetchUsage: async () => {
    try {
      const usage = await getUsage();
      set(state => ({
        limits: state.limits
          ? { ...state.limits, remainingAiCalls: usage.remainingCalls }
          : null,
      }));
    } catch {
      // Silently fail, usage display will be stale
    }
  },

  updateLimits: (limits: Partial<TierLimits>) => {
    set(state => ({
      limits: state.limits ? { ...state.limits, ...limits } : null,
    }));
  },
}));
