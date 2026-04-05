import { useEffect, useRef } from 'react';
import { supabase } from '@/config/supabase';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { useUserId } from '@/hooks/useUserId';

/**
 * Subscribe to Supabase realtime changes for:
 *  - assignments (INSERT / UPDATE affecting the current user)
 *  - trainer_client_links (INSERT / DELETE for trainer)
 *
 * Triggers a store re-hydrate on change to keep UI in sync.
 */
export function useRealtime(
  onClientLinksChange?: () => void,
) {
  const userId = useUserId();
  const role = useAuthStore((s) => s.role);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId || !role) return;

    const channel = supabase
      .channel('ph7-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: role === 'trainer'
            ? `trainer_id=eq.${userId}`
            : `client_id=eq.${userId}`,
        },
        () => {
          // Re-hydrate assignment store on any change
          useAssignmentStore.getState().hydrate(role, userId);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trainer_client_links',
          filter: `trainer_id=eq.${userId}`,
        },
        () => {
          onClientLinksChange?.();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, role, onClientLinksChange]);
}
