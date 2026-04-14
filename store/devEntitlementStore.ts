import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EntitlementRecord } from '@/types/entitlement';

export type DevEntitlementScenario =
  | 'use_real'
  | 'free_under_cap'
  | 'free_at_cap'
  | 'trial_active'
  | 'premium_active'
  | 'admin_override'
  | 'expired_trial';

interface DevEntitlementState {
  scenario: DevEntitlementScenario;
  mockGenerationEnabled: boolean;
  setScenario: (scenario: DevEntitlementScenario) => void;
  setMockGenerationEnabled: (enabled: boolean) => void;
  reset: () => void;
}

function addDays(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

export const useDevEntitlementStore = create<DevEntitlementState>()(
  persist(
    (set) => ({
      scenario: 'use_real',
      mockGenerationEnabled: false,
      setScenario: (scenario) => set({ scenario }),
      setMockGenerationEnabled: (mockGenerationEnabled) => set({ mockGenerationEnabled }),
      reset: () => set({ scenario: 'use_real', mockGenerationEnabled: false }),
    }),
    {
      name: 'dev-entitlement-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function isDevEntitlementScenarioActive(scenario: DevEntitlementScenario) {
  return scenario !== 'use_real';
}

export function getDevScenarioLabel(scenario: DevEntitlementScenario) {
  return {
    use_real: 'Real entitlement state',
    free_under_cap: 'Free under cap',
    free_at_cap: 'Free at cap',
    trial_active: 'Trial active',
    premium_active: 'Premium active',
    admin_override: 'Admin override',
    expired_trial: 'Expired trial',
  }[scenario];
}

export function getDevScenarioUsageCount(scenario: DevEntitlementScenario, limit: number) {
  switch (scenario) {
    case 'free_under_cap':
      return 0;
    case 'free_at_cap':
    case 'expired_trial':
      return limit;
    default:
      return 0;
  }
}

export function getDevScenarioCustomRoutineCount(scenario: DevEntitlementScenario, limit: number) {
  switch (scenario) {
    case 'free_under_cap':
      return 0;
    case 'free_at_cap':
    case 'expired_trial':
      return limit;
    default:
      return 0;
  }
}

export function getDevScenarioEntitlementRecord(scenario: DevEntitlementScenario): EntitlementRecord | null {
  switch (scenario) {
    case 'use_real':
      return null;
    case 'free_under_cap':
    case 'free_at_cap':
      return {
        planTier: 'free',
        trialStartedAt: null,
        trialEndsAt: null,
        trialUsed: false,
        adminOverride: false,
        source: 'mock',
        updatedAt: new Date().toISOString(),
      };
    case 'trial_active':
      return {
        planTier: 'free',
        trialStartedAt: addDays(-1),
        trialEndsAt: addDays(6),
        trialUsed: true,
        adminOverride: false,
        source: 'mock',
        updatedAt: new Date().toISOString(),
      };
    case 'premium_active':
      return {
        planTier: 'premium',
        trialStartedAt: null,
        trialEndsAt: null,
        trialUsed: true,
        adminOverride: false,
        source: 'mock',
        updatedAt: new Date().toISOString(),
      };
    case 'admin_override':
      return {
        planTier: 'free',
        trialStartedAt: null,
        trialEndsAt: null,
        trialUsed: true,
        adminOverride: true,
        source: 'admin',
        updatedAt: new Date().toISOString(),
      };
    case 'expired_trial':
      return {
        planTier: 'free',
        trialStartedAt: addDays(-8),
        trialEndsAt: addDays(-1),
        trialUsed: true,
        adminOverride: false,
        source: 'mock',
        updatedAt: new Date().toISOString(),
      };
  }
}