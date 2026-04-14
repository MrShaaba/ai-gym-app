import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import type { UserRole } from '@/types/user';
import type { Profile } from '@/services/profiles';
import { getBillingAdapter } from '@/services/entitlements';
import { signOut } from '@/services/auth';
import { CREATE_ROUTINE_DRAFT_KEY } from '@/services/routineDrafts';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useEntitlementStore } from '@/store/entitlementStore';

const ONBOARDED_KEY = 'ai-gym:hasOnboarded';
const USER_BOUND_STORAGE_KEYS = ['workout-storage', 'assignment-storage', CREATE_ROUTINE_DRAFT_KEY];

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
  clearUserScope: (options?: { clearPersisted?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
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

  clearUserScope: async ({ clearPersisted = false } = {}) => {
    if (clearPersisted) {
      await AsyncStorage.multiRemove(USER_BOUND_STORAGE_KEYS).catch(() => {});
    }

    useWorkoutStore.getState().reset();
    useAssignmentStore.getState().reset();
    useEntitlementStore.getState().reset();

    set({
      isAuthenticated: false,
      role: null,
      pendingRole: null,
      user: null,
      profile: null,
    });
  },

  logout: async () => {
    await useAuthStore.getState().clearUserScope({ clearPersisted: true });
    await getBillingAdapter().logOut().catch(() => {});
    await signOut().catch(() => {});
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
