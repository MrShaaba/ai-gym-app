import { useState, useEffect, useCallback } from 'react';
import { useUserId } from '@/hooks/useUserId';
import { getGenerationCount } from '@/services/generation';
import { FREE_AI_GENERATION_LIMIT } from '@/config/constants';

/**
 * Reusable premium gate hook.
 * Returns whether AI generation is available and usage stats.
 * When billing is added, extend this to check subscription status.
 */
export function usePremiumGate() {
  const userId = useUserId();
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const count = await getGenerationCount(userId);
      setUsed(count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remaining = Math.max(0, FREE_AI_GENERATION_LIMIT - used);
  const canGenerate = remaining > 0;
  // TODO: When billing is added, premium users bypass the limit
  const isPremium = false;

  return {
    canGenerate: canGenerate || isPremium,
    isPremium,
    used,
    remaining,
    limit: FREE_AI_GENERATION_LIMIT,
    loading,
    refresh,
  };
}
