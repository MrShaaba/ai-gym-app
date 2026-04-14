import type { FeatureKey } from '@/types/entitlement';

export const FEATURE_GATES: Record<FeatureKey, { freeLimit?: number }> = {
  ai_generation: {
    freeLimit: 3,
  },
  grouped_routine_authoring: {},
};

export const TRIAL_LENGTH_DAYS = 7;

export const FREE_CUSTOM_ROUTINE_LIMIT = 3;