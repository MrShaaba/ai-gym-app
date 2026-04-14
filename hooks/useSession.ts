import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useEntitlementStore } from '@/store/entitlementStore';
import { getSession, onAuthStateChange } from '@/services/auth';
import { getProfile } from '@/services/profiles';

async function hydrateStoresForUser(userId: string, role: 'client' | 'trainer') {
  await Promise.all([
    useAssignmentStore.getState().hydrate(role, userId),
    useWorkoutStore.getState().hydrateHistory(userId),
    useEntitlementStore.getState().hydrate(userId, role),
  ]);
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
  const clearUserScope = useAuthStore((s) => s.clearUserScope);

  useEffect(() => {
    let mounted = true;

    const hydrateAuthenticatedUser = async (session: NonNullable<Awaited<ReturnType<typeof getSession>>>) => {
      setLoading(true);
      setSession(session);

      const profile = await getProfile(session.user.id);
      if (!mounted) return;

      if (!profile) {
        await clearUserScope({ clearPersisted: true });
        if (mounted) setLoading(false);
        return;
      }

      setProfile(profile);
      await hydrateStoresForUser(session.user.id, profile.role);

      if (mounted) setLoading(false);
    };

    // 1. Restore persisted session
    (async () => {
      try {
        const session = await getSession();
        if (!mounted) return;

        if (session?.user) {
          await hydrateAuthenticatedUser(session);
          return;
        }

        await clearUserScope({ clearPersisted: false });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 2. Listen to future auth events
    const unsubscribe = onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        await clearUserScope({ clearPersisted: true });
        if (mounted) setLoading(false);
        return;
      }

      if (!session) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await hydrateAuthenticatedUser(session);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setSession, setProfile, setLoading, clearUserScope]);
}
