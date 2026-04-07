import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { getSession, onAuthStateChange } from '@/services/auth';
import { getProfile } from '@/services/profiles';

/** Reset persisted stores then hydrate fresh data for the new user. */
function resetAndHydrateStores(userId: string, role: 'client' | 'trainer') {
  useAssignmentStore.getState().reset();
  useWorkoutStore.getState().reset();
  useAssignmentStore.getState().hydrate(role, userId);
  useWorkoutStore.getState().hydrateHistory(userId);
}

/**
 * Bootstrap auth state on app mount.
 * Restores a persisted Supabase session, loads the profile, and subscribes
 * to future auth changes (sign-in, sign-out, token refresh).
 */
export function useSession() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let mounted = true;

    // 1. Restore persisted session
    (async () => {
      try {
        const session = await getSession();
        if (!mounted) return;

        if (session?.user) {
          setSession(session);
          const profile = await getProfile(session.user.id);
          if (!mounted) return;
          if (profile) {
            setProfile(profile);
            resetAndHydrateStores(session.user.id, profile.role);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 2. Listen to future auth events
    const unsubscribe = onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        logout();
        return;
      }

      if (!session) return;

      setSession(session);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profile = await getProfile(session.user.id);
        if (mounted && profile) {
          setProfile(profile);
          resetAndHydrateStores(session.user.id, profile.role);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setSession, setProfile, setLoading, logout]);
}
