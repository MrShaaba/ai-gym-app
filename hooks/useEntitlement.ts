import { useAuthStore } from '@/store/authStore';
import { resolveEntitlement } from '@/services/entitlements';
import { useEntitlementStore } from '@/store/entitlementStore';
import {
  getDevScenarioEntitlementRecord,
  getDevScenarioLabel,
  isDevEntitlementScenarioActive,
  useDevEntitlementStore,
} from '@/store/devEntitlementStore';

export function useEntitlement() {
  const loading = useEntitlementStore((s) => s.loading);
  const record = useEntitlementStore((s) => s.record);
  const resolved = useEntitlementStore((s) => s.resolved);
  const role = useAuthStore((s) => s.role);
  const devScenario = useDevEntitlementStore((s) => s.scenario);
  const mockGenerationEnabled = useDevEntitlementStore((s) => s.mockGenerationEnabled);

  const isUsingDevOverride = __DEV__ && isDevEntitlementScenarioActive(devScenario);
  const effectiveLoading = isUsingDevOverride ? false : loading;
  const effectiveRecord = isUsingDevOverride
    ? getDevScenarioEntitlementRecord(devScenario)
    : record;
  const effectiveResolved = effectiveRecord
    ? resolveEntitlement(effectiveRecord, role)
    : resolved;

  return {
    loading: effectiveLoading,
    record: effectiveRecord,
    resolved: effectiveResolved,
    state: effectiveResolved?.state ?? 'free',
    isPremium: effectiveResolved?.isPremium ?? false,
    isTrialActive: effectiveResolved?.isTrialActive ?? false,
    isAdminOverride: effectiveResolved?.isAdminOverride ?? false,
    isUsingDevOverride,
    devScenario,
    devScenarioLabel: isUsingDevOverride ? getDevScenarioLabel(devScenario) : null,
    mockGenerationEnabled: __DEV__ ? mockGenerationEnabled : false,
  };
}