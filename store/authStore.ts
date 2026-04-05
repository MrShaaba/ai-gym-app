import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import type { UserRole } from '@/types/user';
import type { Profile } from '@/services/profiles';
import { signOut } from '@/services/auth';

const ONBOARDED_KEY = 'ai-gym:hasOnboarded';

interface AuthState {
  /** True while the session is being restored on cold start. */
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  pendingRole: UserRole | null;
  hasOnboarded: boolean;
  /** Supabase user object (null when signed-out). */
  user: User | null;
  /** DB profile row. */
  profile: Profile | null;

  // --- actions ---
  setLoading: (v: boolean) => void;
  setSession: (session: Session) => void;
  setProfile: (profile: Profile) => void;
  login: (role: UserRole) => void;
  logout: () => void;
  setPendingRole: (role: UserRole) => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  isAuthenticated: false,
  role: null,
  pendingRole: null,
  hasOnboarded: false,
  user: null,
  profile: null,

  setLoading: (loading) => set({ loading }),

  setSession: (session) =>
    set({
      isAuthenticated: true,
      user: session.user,
      role: (session.user.user_metadata?.role as UserRole) ?? null,
    }),

  setProfile: (profile) =>
    set({ profile, role: profile.role }),

  login: (role) => set({ isAuthenticated: true, role, pendingRole: null }),

  logout: () => {
    signOut().catch(() => {}); // fire-and-forget; clears server session
    set({
      isAuthenticated: false,
      role: null,
      pendingRole: null,
      user: null,
      profile: null,
    });
  },

  setPendingRole: (role) => set({ pendingRole: role }),

  completeOnboarding: () => {
    AsyncStorage.setItem(ONBOARDED_KEY, '1');
    set({ hasOnboarded: true });
  },
}));

// Hydrate hasOnboarded from disk on import
AsyncStorage.getItem(ONBOARDED_KEY).then((v) => {
  if (v === '1') useAuthStore.setState({ hasOnboarded: true });
});
