import type { UserRole } from '@/types/user';

export type EntitlementState = 'free' | 'trial_active' | 'premium_active' | 'admin_override';

export type PlanTier = 'free' | 'premium';

export type BillingSource = 'mock' | 'manual' | 'admin' | 'revenuecat';

export type FeatureKey = 'ai_generation' | 'grouped_routine_authoring';

export interface EntitlementRecord {
  planTier: PlanTier;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialUsed: boolean;
  adminOverride: boolean;
  source: BillingSource;
  updatedAt: string;
}

export interface ResolvedEntitlement {
  role: UserRole | null;
  state: EntitlementState;
  planTier: PlanTier;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  isPremium: boolean;
  isAdminOverride: boolean;
  canUsePremiumFeatures: boolean;
}

export interface FeatureGateResult {
  feature: FeatureKey;
  allowed: boolean;
  requiresUpgrade: boolean;
  reason: 'ok' | 'trial_active' | 'upgrade_required' | 'loading';
}