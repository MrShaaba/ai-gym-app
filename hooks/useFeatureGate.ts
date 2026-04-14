import { useEntitlement } from '@/hooks/useEntitlement';
import type { FeatureGateResult, FeatureKey } from '@/types/entitlement';

export function useFeatureGate(feature: FeatureKey): FeatureGateResult {
  const { loading, isPremium, isTrialActive, isAdminOverride } = useEntitlement();

  if (loading) {
    return { feature, allowed: false, requiresUpgrade: false, reason: 'loading' };
  }

  if (isPremium || isTrialActive || isAdminOverride) {
    return { feature, allowed: true, requiresUpgrade: false, reason: isTrialActive ? 'trial_active' : 'ok' };
  }

  return { feature, allowed: false, requiresUpgrade: true, reason: 'upgrade_required' };
}