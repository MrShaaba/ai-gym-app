import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/config/supabase';
import { getProfile } from '@/services/profiles';

/**
 * Returns the current user's ID, self-healing from Supabase if the store
 * lost the `user` object (e.g., after registration → biometric-setup).
 */
export function useUserId(): string | undefined {
  const storeUserId = useAuthStore((s) => s.user?.id);
  const [recovered, setRecovered] = useState<string | undefined>(storeUserId);

  useEffect(() => {
    if (storeUserId) {
      setRecovered(storeUserId);
      return;
    }

    // Store doesn't have user — try to recover from Supabase session
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      useAuthStore.getState().setSession(session);
      const profile = await getProfile(session.user.id);
      if (!cancelled && profile) useAuthStore.getState().setProfile(profile);
      if (!cancelled) setRecovered(session.user.id);
    })();

    return () => { cancelled = true; };
  }, [storeUserId]);

  return storeUserId ?? recovered;
}
