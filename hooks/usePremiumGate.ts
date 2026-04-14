import { useState, useEffect, useCallback } from 'react';
import { useUserId } from '@/hooks/useUserId';
import { getGenerationCount } from '@/services/generation';
import { FEATURE_GATES } from '@/config/featureGates';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useFeatureGate } from '@/hooks/useFeatureGate';

/**
 * Reusable premium gate hook.
 * Returns whether AI generation is available and usage stats.
 * When billing is added, extend this to check subscription status.
 */
export function usePremiumGate() {
  const userId = useUserId();
  const {
    isAdminOverride,
    isPremium,
    isTrialActive,
    loading: entitlementLoading,
    state,
    isUsingDevOverride,
    devScenario,
    devScenarioLabel,
    mockGenerationEnabled,
  } = useEntitlement();
  const gate = useFeatureGate('ai_generation');
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = FEATURE_GATES.ai_generation.freeLimit ?? 0;

  const refresh = useCallback(async () => {
    if (!userId) {
      setUsed(0);
      setLoading(false);
      return;
    }
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

  const remaining = Math.max(0, limit - used);
  const canGenerate = gate.allowed || remaining > 0;
  const isAtCap = !isPremium && !isTrialActive && remaining === 0;

  useEffect(() => {
    refresh();
  }, [refresh, devScenario]);

  return {
    canGenerate,
    isAdminOverride,
    isPremium,
    isTrialActive,
    entitlementState: state,
    isUsingDevOverride,
    devScenario,
    devScenarioLabel,
    mockGenerationEnabled,
    used,
    remaining,
    limit,
    isAtCap,
    loading: loading || entitlementLoading,
    refresh,
  };
}
